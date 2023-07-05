import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { storage } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import JIRAManager from "./lib/JIRAManager"
import ReplacementManager from "./lib/ReplacementManager"
import DebugManager from "./lib/debugManager"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateAnswer(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const callAnsweredDate = dayjs().tz(issueConfiguration.timezone)

    const jiraManager = new JIRAManager()
    const replacementManager = new ReplacementManager()
    const debugManager = new DebugManager()

    const time = callAnsweredDate.format(issueConfiguration.hourFormat)
    const timeField = ReplacementManager.replaceVariables(issueConfiguration.timeField, [
        ["{{$time}}", time]
    ]);

    try {
        const body = getBodyData(req.body)

        debugManager.log(debug, [
            `${timeField}: SipgateAnswer Func -> Answering Call`,
            `${timeField}: SipgateAnswer Func -> Body Data: ${JSON.stringify(body, null, 4)}`
        ])

        if (body.direction === "in") {
            const callInfoFromStorage = await storage.get(body.xcid)
            const userID = body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : ""
            const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
            const accountId = await storage.get(`sipgate_id_${Array.isArray(userID) ? userID[0] : userID}`)

            if (callInfoFromStorage) {
                const callLogConfiguration = await storage.get("callLogConfiguration")
                const replacements = replacementManager.createReplacementMapping({
                    issueConfiguration,
                    body,
                    callActionDate: callAnsweredDate,
                    callInfoFromStorage
                })
                var description = `${callInfoFromStorage.description}${callLogConfiguration?.answerCall ? `\n${callLogConfiguration.answerCall}` : ""}`

                description = await jiraManager.replaceJQLVariables(description, replacements)
                description = ReplacementManager.replaceVariables(description, replacements)

                const resDes = jiraManager.updateIssueDescription(callInfoFromStorage.id, description)

                debugManager.log(debug, [
                    `${timeField}: SipgateAnswer Func -> UserID: ${JSON.stringify(userID, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> User: ${JSON.stringify(user, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                    `${timeField}: SipgateAnswer Func -> Edited Description: ${description}`
                ])

                await storage.set(body.xcid, { ...callInfoFromStorage, description, date: callAnsweredDate.toJSON() })

                if (accountId) {
                    const resAs = jiraManager.assignUser(callInfoFromStorage.id, accountId)

                    debugManager.log(debug, [
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
        if (debug.debugOption) {
            debug.debugLog.push(`${timeField}: SipgateAnswer Func -> Error: ${JSON.stringify(error, null, 4)}`)

            console.error(`${timeField}: SipgateAnswer Func -> Error: ${JSON.stringify(error, null, 4)}`)

            await storage.set("debug", debug)
        }

        return {
            body: error + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}