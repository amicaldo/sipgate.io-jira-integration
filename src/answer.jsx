import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import api, { route, storage } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import debugLogging from "./lib/debugLogging"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateAnswer(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const debugOption = debug.debugOption
    const debugLog = debug.debugLog
    const dateData = dayjs().tz(issueConfiguration.timezone)
    const time = dateData.format(issueConfiguration.hourFormat)
    const timeField = issueConfiguration.timeField.replace("{{$time}}", time)

    try {
        const body = getBodyData(req.body)

        debugLogging(debugOption, debugLog, [
            `${timeField}: SipgateAnswer Func -> Answering Call`,
            `${timeField}: SipgateAnswer Func -> Body Data: ${JSON.stringify(body, null, 4)}`
        ])

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            const userID = body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : ""
            const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
            const accountId = await storage.get(`sipgate_id_${Array.isArray(userID) ? userID[0] : userID}`)

            if (data) {
                const callDuration = dateData.diff(dayjs(data.date), "s")
                const callLogConfiguration = await storage.get("callLogConfiguration")
                const description = `${callLogConfiguration?.answerCall ? `\n${callLogConfiguration.answerCall}` : ""}`
                    .replace("{{$timeField}}", issueConfiguration.timeField)
                    .replace("{{$number}}", `#${body.from}`)
                    .replace("{{$date}}", dateData.format(issueConfiguration.dateFormat))
                    .replace("{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, ""))
                    .replace("{{$sipgateUsername}}", user.replace("+", " "))
                    .replace("{{$sipgatePassword}}", body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : "")
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
                    `${timeField}: SipgateAnswer Func -> UserID: ${JSON.stringify(userID, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> User: ${JSON.stringify(user, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> Edited Description: ${data.description}${description}`
                ])

                await storage.set(body.xcid, { ...data, description: `${data.description}${description}`, date: dateData.toJSON() })

                if (accountId) {
                    const resAs = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/assignee`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ accountId })
                    })

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipgateAnswer Func -> Assign Response: ${JSON.stringify(resAs, null, 4)}`
                    ])
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
        if (debugOption) {
            debugLog.push(`${timeField}: SipgateAnswer Func -> Error: ${JSON.stringify(error, null, 4)}`)

            console.error(`${timeField}: SipgateAnswer Func -> Error: ${JSON.stringify(error, null, 4)}`)

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