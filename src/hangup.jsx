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
    const debugLog = debug ? await storage.get("debugLog") : null
    const dateData = dayjs().tz(issueConfiguration.timeZone)
    const time = dateData.format(issueConfiguration.hourFormat)

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const cause = body.cause

        if (debug) {
            debugLog.push(`${time} Uhr: SipgateHangup Func -> Ending Call`)
            debugLog.push(`${time} Uhr: SipgateHangup Func -> Cause: ${cause}`)
            debugLog.push(`${time} Uhr: SipgateHangup Func -> Body Data: ${JSON.stringify(body, null, 4)}`)
            debugLog.push(`${time} Uhr: SipgateHangup Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`)

            await storage.set("debugLog", debugLog)
        }

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            let description

            if (cause === "normalClearing") {
                if (data) {
                    const callDuration = dateData.diff(dayjs(data.date), "s")

                    description = `${issueConfiguration?.normalClearing ? `\n${issueConfiguration.normalClearing}` : ""}${issueConfiguration?.callDuration ? `\n\n${issueConfiguration.callDuration}` : ""}`
                        .replace("{{$time}}", time)
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

                        if (debug) {
                            debugLog.push(`${time} Uhr: SipgateHangup Func -> Transsition Response: ${JSON.stringify(resTrans, null, 4)}`)

                            await storage.set("debugLog", debugLog)
                        }
                    }
                }
            }
            else if (cause !== "forwarded") {
                description = `${issueConfiguration?.[cause] ? `\n${issueConfiguration[cause]}` : ""}`
                    .replace("{{$time}}", time)
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

                if (debug) {
                    debugLog.push(`${time} Uhr: SipgateHangup Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`)
                    debugLog.push(`${time} Uhr: SipgateHangup Func -> Edited Description: ${data.description}${description}`)

                    await storage.set("debugLog", debugLog)
                }

                if (cause == "normalClearing") {
                    if (debug) {
                        debugLog.push(`${time} Uhr: SipgateHangup Func -> Call Ended, removing Storage for: ${body.xcid}`)

                        await storage.set("debugLog", debugLog)
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
    } catch (error) {
        if (debug) {
            debugLog.push(`${time} Uhr: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

            await storage.set("debugLog", debugLog)
        }

        return {
            body: error + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}