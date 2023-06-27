import dayjs from "dayjs"
import timezone from "dayjs/plugin/timezone"
import api, { route, storage } from "@forge/api"

dayjs.extend(timezone)

function getBodyData(body) {
    let obj = {}

    body.split("&").forEach(function (part) {
        var item = part.split("=")

        obj[item[0]] = decodeURIComponent(item[1])
    });

    return obj
}


export async function SipgateHangup(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debugOption")
    const debugOption = debug.debugOption
    const debugLog = debug.debugLog
    const dateData = dayjs().tz(issueConfiguration.timeZone)
    const time = dateData.format(issueConfiguration.hourFormat)
    const timeField = issueConfiguration.timeField.replace("{{$time}}", time)

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const cause = body.cause

        if (debugOption) {
            debugLog.push(`${timeField}: SipgateHangup Func -> Ending Call`)
            debugLog.push(`${timeField}: SipgateHangup Func -> Cause: ${cause}`)
            debugLog.push(`${timeField}: SipgateHangup Func -> Body Data: ${JSON.stringify(body, null, 4)}`)
            debugLog.push(`${timeField}: SipgateHangup Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`)

            console.log(`${timeField}: SipgateHangup Func -> Ending Call`)
            console.log(`${timeField}: SipgateHangup Func -> Cause: ${cause}`)
            console.log(`${timeField}: SipgateHangup Func -> Body Data: ${JSON.stringify(body, null, 4)}`)
            console.log(`${timeField}: SipgateHangup Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`)

            await storage.set("debug", { debugOption, debugLog })
        }

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            const callLogConfiguration = await storage.get("callLogConfiguration")
            let description

            if (data) {
                const callDuration = dateData.diff(dayjs(data.date), "s")

                if (cause === "normalClearing") {
                    description = `${callLogConfiguration?.normalClearing ? `\n${callLogConfiguration.normalClearing}` : ""}${callLogConfiguration?.callDuration ? `\n\n${callLogConfiguration.callDuration}` : ""}`
                        .replace("{{$timeField}}", issueConfiguration.timeField)
                        .replace("{{number}}", `#${body.from}`)
                        .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                        .replace("{{$rating}}", tellows?.tellows?.score ? tellows.tellows.score : "")
                        .replace("{{$city}}", tellows?.tellows?.location ? tellows.tellows.location : "")
                        .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))
                        .replace("{{$sipgatePassword}}", body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : "")
                        .replace("{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0"))
                        .replace("{{$seconds}}", `${callDuration % 60}`.padStart(2, "0"))

                    if (queryParameters.closeID && !body.diversion) {
                        const resTrans = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/transitions`, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                transition: { "id": queryParameters.closeID[0] }
                            })
                        })

                        if (debugOption) {
                            debugLog.push(`${timeField}: SipgateHangup Func -> Transsition Response: ${JSON.stringify(resTrans, null, 4)}`)

                            console.log(`${timeField}: SipgateHangup Func -> Transsition Response: ${JSON.stringify(resTrans, null, 4)}`)

                            await storage.set("debug", { debugOption, debugLog })
                        }
                    }
                }
                else if (cause !== "forwarded") {
                    description = `${callLogConfiguration?.[cause] ? `\n${callLogConfiguration[cause]}` : ""}`
                        .replace("{{$timeField}}", issueConfiguration.timeField)
                        .replace("{{number}}", `#${body.from}`)
                        .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                        .replace("{{$rating}}", tellows?.tellows?.score ? tellows.tellows.score : "")
                        .replace("{{$city}}", tellows?.tellows?.location ? tellows.tellows.location : "")
                        .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))
                        .replace("{{$sipgatePassword}}", body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : "")
                        .replace("{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0"))
                        .replace("{{$seconds}}", `${callDuration % 60}`.padStart(2, "0"))
                }

                if (description) {
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

                    if (debugOption) {
                        debugLog.push(`${timeField}: SipgateHangup Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`)
                        debugLog.push(`${timeField}: SipgateHangup Func -> Edited Description: ${data.description}${description}`)

                        console.log(`${timeField}: SipgateHangup Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`)
                        console.log(`${timeField}: SipgateHangup Func -> Edited Description: ${data.description}${description}`)

                        await storage.set("debug", { debugOption, debugLog })
                    }

                    if (cause == "normalClearing") {
                        if (debugOption) {
                            debugLog.push(`${timeField}: SipgateHangup Func -> Call Ended, removing Storage for: ${body.xcid}`)

                            console.log(`${timeField}: SipgateHangup Func -> Call Ended, removing Storage for: ${body.xcid}`)

                            await storage.set("debug", { debugOption, debugLog })
                        }

                        await storage.delete(body.xcid)
                    }
                    else {
                        await storage.set(body.xcid, { ...data, description: `${data.description}${description}` })
                    }
                }

                return {
                    headers: { "Content-Type": ["application/json"] },
                    body: "",
                    statusCode: 200,
                    statusText: "OK"
                }
            }
        }
    } catch (error) {
        if (debugOption) {
            debugLog.push(`${timeField}: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

            console.log(`${timeField}: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

            await storage.set("debug", { debugOption, debugLog })
        }

        return {
            body: error + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}