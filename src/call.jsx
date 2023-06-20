import xml from "xml"
import dayjs from "dayjs"
import timezone from "dayjs/plugin/timezone"
import api, { fetch, route, storage } from "@forge/api"

dayjs.extend(timezone)

function getBodyData(body) {
    let obj = {}

    body.split("&").forEach(function (part) {
        var item = part.split("=")

        obj[item[0]] = decodeURIComponent(item[1])
    });

    return obj
}

export async function SipgateCall(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debugOption")
    const debugLog = debug ? await storage.get("debugLog") : null
    const dateData = dayjs().tz(issueConfiguration.timeZone)
    const time = dateData.format(issueConfiguration.hourFormat)

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters

        if (debug) {
            debugLog.push(`${time} Uhr: SipgateCall Func -> ${body.diversion ? "Redirection Call" : "Creating Issue"}`)
            debugLog.push(`${time} Uhr: SipgateCall Func -> Body Data: ${JSON.stringify(body, null, 4)}`)
            debugLog.push(`${time} Uhr: SipgateCall Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`)

            await storage.set("debugLog", debugLog)
        }

        if (body.to?.length > 3) {
            if (body.direction === "in") {
                const answerURL = await webTrigger.getUrl("sipgateAnswer")
                const hangupURL = await webTrigger.getUrl("sipgateHangup")
                const data = await storage.get(body.xcid)

                if (body.diversion && data) {
                    const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
                    const description = `${issueConfiguration?.redirectedCall ? `\n${issueConfiguration.redirectedCall}` : ""}`
                        .replace("{{$time}}", time)
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))

                        const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                description: {
                                    content: [
                                        {
                                            content: [
                                                {
                                                    text: `${data.description}${description}`,
                                                    type: "text"
                                                }
                                            ],
                                            type: "paragraph"
                                        }
                                    ],
                                    type: "doc",
                                    version: 1
                                }
                            }
                        })
                    })

                    if (debug) {
                        debugLog.push(`${time} Uhr: SipcateCall Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`)
                        debugLog.push(`${time} Uhr: SipcateCall Func -> Edited Description: ${data.description}${description}`)

                        await storage.set("debugLog", debugLog)
                    }

                    await storage.set(body.xcid, { ...data, description: `${data.description}${description}` })
                }
                else {
                    const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)
                    const tellows = await tellowsRaw.json()
                    var description = issueConfiguration.description
                    var summary = issueConfiguration.issueSummary

                    summary
                        .replace("{{number}}", `#${body.from}`)
                        .replace("{{$spamRatingField}}", tellows?.tellows?.score ? `${issueConfiguration.spamRatingField}`.replace("{{$rating}}", tellows.tellows.score) : "")
                        .replace("{{$cityField}}", tellows?.tellows?.location ? `${issueConfiguration.cityField}`.replace("{{$city}}", tellows.tellows.location) : "")
                        .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                        .replace("{{$time}}", time)

                    description += `\n${issueConfiguration.incommingCall}`
                    description
                        .replace("{{$time}}", time)
                        .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))

                    if (debug) {
                        debugLog.push(`${time} Uhr: SipcateCall Func -> Issue Summary: ${summary}`)
                        debugLog.push(`${time} Uhr: SipcateCall Func -> Issue Description: ${description}`)

                        await storage.set("debugLog", debugLog)
                    }

                    const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                summary,
                                issuetype: {
                                    id: queryParameters.issueID[0]
                                },
                                project: {
                                    key: queryParameters.project[0]
                                },
                                [`customfield_${queryParameters.phoneField[0]}`]: `+${body.from}`,
                                description: {
                                    content: [
                                        {
                                            content: [
                                                {
                                                    text: description,
                                                    type: "text"
                                                }
                                            ],
                                            type: "paragraph"
                                        }
                                    ],
                                    type: "doc",
                                    version: 1
                                }
                            }
                        })
                    })
                    const issue = await issueRaw.json()

                    if (debug) {
                        debugLog.push(`${time} Uhr: SipcateCall Func -> Raw Issue Data: ${JSON.stringify(issueRaw, null, 4)}`)
                        debugLog.push(`${time} Uhr: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issue, null, 4)}`)

                        await storage.set("debugLog", debugLog)
                    }

                    await storage.set(body.xcid, { id: issue.id, description })
                }

                return {
                    headers: { "Content-Type": ["application/xml"] },
                    body: xml({
                        Response: [
                            { _attr: { onAnswer: `${answerURL}` } },
                            { _attr: { onHangup: `${hangupURL}?closeID=${queryParameters.closeID[0]}` } }
                        ]
                    }),
                    statusCode: 200,
                    statusText: "OK"
                }
            }
        }

    } catch (err) {
        if (debug) {
            debugLog.push(`${time} Uhr: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            await storage.set("debugLog", debugLog)
        }

        return {
            body: err + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}