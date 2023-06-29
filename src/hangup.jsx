import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import api, { route, storage } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import debugLogging from "./lib/debugLogging"

dayjs.extend(utc)
dayjs.extend(timezone)


export async function SipgateHangup(req) {
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
        const cause = body.cause

        debugLogging(debugOption, debugLog, [
            `${timeField}: SipgateHangup Func -> Ending Call`,
            `${timeField}: SipgateHangup Func -> Cause: ${cause}`,
            `${timeField}: SipgateHangup Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
            `${timeField}: SipgateHangup Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
        ])

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            const callLogConfiguration = await storage.get("callLogConfiguration")
            let description

            if (data) {
                const callDuration = dateData.diff(dayjs(data.date), "s")
                const userID = body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : ""
                const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""

                if (cause === "normalClearing") {
                    description = `${callLogConfiguration?.normalClearing ? `\n${callLogConfiguration.normalClearing}` : ""}${callLogConfiguration?.callDuration ? `\n\n${callLogConfiguration.callDuration}` : ""}`

                    if (queryParameters.closeID && !body.diversion) {
                        const resTrans = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/transitions`, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ transition: { "id": queryParameters.closeID[0] } })
                        })

                        debugLogging(debugOption, debugLog, [
                            `${timeField}: SipgateHangup Func -> Transsition Response: ${JSON.stringify(resTrans, null, 4)}`
                        ])
                    }
                }
                else if (cause !== "forwarded") {
                    description = `${callLogConfiguration?.[cause] ? `\n${callLogConfiguration[cause]}` : ""}`
                }

                if (description) {
                    description = description
                        .replace("{{$timeField}}", issueConfiguration.timeField)
                        .replace("{{$number}}", `#${body.from}`)
                        .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                        .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))
                        .replace("{{$sipgatePassword}}", userID)
                        .replace("{{$time}}", time)
                        .replace("{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0"))
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
                        `${timeField}: SipgateHangup Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                        `${timeField}: SipgateHangup Func -> Edited Description: ${data.description}${description}`
                    ])

                    if (cause == "normalClearing") {
                        debugLogging(debugOption, debugLog, [
                            `${timeField}: SipgateHangup Func -> Call Ended, removing Storage for: ${body.xcid}`
                        ])

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

            console.error(`${timeField}: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

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