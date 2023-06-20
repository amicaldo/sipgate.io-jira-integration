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


export async function SipgateAnswer(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debugOption")
    const debugLog = debug ? await storage.get("debugLog") : null
    const dateData = dayjs().tz(issueConfiguration.timeZone)
    const time = dateData.format(issueConfiguration.hourFormat)

    try {
        const body = getBodyData(req.body)

        if (debug) {
            debugLog.push(`${time} Uhr: SipgateAnswer Func -> Answering Call`)
            debugLog.push(`${time} Uhr: SipgateAnswer Func -> Body Data: ${JSON.stringify(body, null, 4)}`)

            await storage.set("debugLog", debugLog)
        }

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            const userID = body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : ""
            const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
            const accountId = await storage.get(`sipgate_id_${Array.isArray(userID) ? userID[0] : userID}`)

            if (data) {
                const description = `${issueConfiguration?.answerCall ? `\n${issueConfiguration.answerCall}` : ""}`
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
                    debugLog.push(`${time} Uhr: SipgateAnswer Func -> UserID: ${JSON.stringify(userID, null, 4)}`)
                    debugLog.push(`${time} Uhr: SipgateAnswer Func -> User: ${JSON.stringify(user, null, 4)}`)
                    debugLog.push(`${time} Uhr: SipgateAnswer Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`)
                    debugLog.push(`${time} Uhr: SipgateAnswer Func -> Edited Description: ${data.description}${description}`)

                    await storage.set("debugLog", debugLog)
                }

                await storage.set(body.xcid, { ...data, description: `${data.description}${description}`, date: dateData.toJSON() })

                if (accountId) {
                    const resAs = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/assignee`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            accountId
                        })
                    })

                    if (debug) {
                        debugLog.push(`${time} Uhr: SipgateAnswer Func -> Assign Response: ${JSON.stringify(resAs, null, 4)}`)

                        await storage.set("debugLog", debugLog)
                    }
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
            debugLog.push(`${time} Uhr: SipgateAnswer Func -> Error: ${JSON.stringify(error, null, 4)}`)

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