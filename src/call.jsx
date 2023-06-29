import xml from "xml"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import api, { fetch, route, storage, webTrigger } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import debugLogging from "./lib/debugLogging"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateCall(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const debugOption = debug.debugOption
    const debugLog = debug.debugLog
    const dateData = dayjs().tz(issueConfiguration.timezone)
    const time = dateData.format(issueConfiguration.hourFormat)
    const timeField = issueConfiguration.timeField.replace("{{$time}}", time)

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const callLogConfiguration = await storage.get("callLogConfiguration")

        debugLogging(debugOption, debugLog, [
            `${timeField}: SipgateCall Func -> ${body.diversion ? "Redirection Call" : "Creating Issue"}`,
            `${timeField}: SipgateCall Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
            `${timeField}: SipgateCall Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
        ])

        if (body.to?.length > 3) {
            if (body.direction === "in") {
                const answerURL = await webTrigger.getUrl("sipgateAnswer")
                const hangupURL = await webTrigger.getUrl("sipgateHangup")
                const data = await storage.get(body.xcid)

                if (body.diversion && data) {
                    const callDuration = dateData.diff(dayjs(data.date), "s")
                    const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
                    const description = `${callLogConfiguration?.redirectedCall ? `\n${callLogConfiguration.redirectedCall}` : ""}`
                        .replace("{{$timeField}}", issueConfiguration.timeField)
                        .replace("{{$number}}", `#${body.from}`)
                        .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                        .replace("{{$rating}}", tellows?.tellows?.score ? tellows.tellows.score : "")
                        .replace("{{$city}}", tellows?.tellows?.location ? tellows.tellows.location : "")
                        .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))
                        .replace("{{$sipgatePassword}}", body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : "")
                        .replace("{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0"))
                        .replace("{{$time}}", time)
                        .replace("{{$seconds}}", `${callDuration % 60}`.padStart(2, "0"))

                    const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                description: {
                                    content: [{
                                        content: [{
                                            text: `${data.description}${description}`,
                                            type: "text"
                                        }],
                                        type: "paragraph"
                                    }],
                                    type: "doc",
                                    version: 1
                                }
                            }
                        })
                    })

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipcateCall Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                        `${timeField}: SipcateCall Func -> Edited Description: ${data.description}${description}`
                    ])

                    await storage.set(body.xcid, { ...data, description: `${data.description}${description}` })
                }
                else {
                    const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)
                    const tellows = await tellowsRaw.json()
                    const jql = await storage.get("jql")
                    var summary = issueConfiguration.summary
                    var description = `${issueConfiguration.description}\n${callLogConfiguration.incommingCall}`

                    if (jql.queriesAmount > 0) {
                        jql.queries.forEach(async ({ query, variable }) => {
                            if (query.length > 0) {
                                const jqlQueryString = query
                                    .replace("{{$spamRatingField}}", issueConfiguration.spamRatingField)
                                    .replace("{{$cityField}}", issueConfiguration.cityField)
                                    .replace("{{$timeField}}", issueConfiguration.timeField)
                                    .replace("{{$number}}", `\\u002b${body.from}`)
                                    .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                                    .replace("{{$time}}", time)
                                    .replace("{{$rating}}", tellows?.tellows?.score ? tellows.tellows.score : "")
                                    .replace("{{$city}}", tellows?.tellows?.location ? tellows.tellows.location : "")
                                    .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))

                                const jqlQueryRaw = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jqlQueryString}`, {
                                    headers: {
                                        "Accept": "application/json"
                                    }
                                })

                                const jqlQuery = await jqlQueryRaw.json()

                                summary = summary.replace(variable, jqlQuery?.issues?.[0]?.fields?.summary ? jqlQuery.issues[0].fields.summary : "")
                                description = description.replace(variable, jqlQuery?.issues?.[0]?.fields?.summary ? jqlQuery.issues[0].fields.summary : "")
                            }
                        })
                    }

                    [
                        ["{{$spamRatingField}}", issueConfiguration.spamRatingField],
                        ["{{$cityField}}", issueConfiguration.cityField],
                        ["{{$timeField}}", issueConfiguration.timeField],
                        ["{{$number}}", `+${body.from}`],
                        ["{{$date}}", dateData.format(issueConfiguration.dateFormat)],
                        ["{{$time}}", time],
                        ["{{$rating}}", tellows?.tellows?.score ? tellows.tellows.score : ""],
                        ["{{$city}}", tellows?.tellows?.location ? tellows.tellows.location : ""],
                        ["{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, "")],
                    ].forEach(([variable, replacement]) => {
                        summary = summary.replace(variable, replacement)
                        description = description.replace(variable, replacement)
                    })

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipcateCall Func -> Issue Summary: ${summary}`,
                        `${timeField}: SipcateCall Func -> Issue Description: ${description}`
                    ])

                    const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                summary,
                                issuetype: { id: queryParameters.issueID[0] },
                                project: { key: queryParameters.project[0] },
                                [`customfield_${queryParameters.phoneField[0]}`]: `+${body.from}`,
                                description: {
                                    content: [{
                                        content: [{
                                            text: description,
                                            type: "text"
                                        }],
                                        type: "paragraph"
                                    }],
                                    type: "doc",
                                    version: 1
                                }
                            }
                        })
                    })
                    const issue = await issueRaw.json()

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipcateCall Func -> Raw Issue Data: ${JSON.stringify(issueRaw, null, 4)}`,
                        `${timeField}: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issue, null, 4)}`
                    ])

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
        if (debugOption) {
            debugLog.push(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            console.error(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            await storage.set("debug", { debugOption, debugLog })
        }

        return {
            body: err + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}