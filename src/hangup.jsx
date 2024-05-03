import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { storage } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import JiraManager from "./lib/jiraManager"
import ReplacementManager from "./lib/replacementManager"
import DebugManager from "./lib/debugManager"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateHangup(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const callHangupDate = dayjs().tz(issueConfiguration.timezone)

    const jiraManager = new JiraManager()
    const replacementManager = new ReplacementManager()
    const debugManager = new DebugManager()

    const time = callHangupDate.format(issueConfiguration.hourFormat)
    const timeField = ReplacementManager.replaceVariables(issueConfiguration.timeField, [
        ["{{$time}}", time]
    ])

    try {
        const body = getBodyData(req.body)

        if (body.direction === "in") {
            const callInfoFromStorage = await storage.get(body.xcid)
            const queryParameters = req.queryParameters
            const cause = body.cause

            debugManager.log(debug, [
                `${timeField}: SipgateHangup Func -> Ending Call`,
                `${timeField}: SipgateHangup Func -> Cause: ${cause}`,
                `${timeField}: SipgateHangup Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
                `${timeField}: SipgateHangup Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
            ])

            if (callInfoFromStorage && cause !== "forwarded") {
                const callLogConfiguration = await storage.get("callLogConfiguration")
                const replacements = replacementManager.createReplacementMapping({
                    issueConfiguration,
                    body,
                    callActionDate: callHangupDate,
                    callInfoFromStorage
                })
                var description = `${callInfoFromStorage.description}${callLogConfiguration?.[cause] ? `\n${callLogConfiguration[cause]}` : ""}${cause === "normalClearing" ? `${callLogConfiguration?.callDuration ? `\n\n${callLogConfiguration.callDuration}` : ""}`: ""}`

                console.log("hangup:52 before replaceJQLVariables");

                description = await jiraManager.replaceJQLVariables(description, replacements)
                description = ReplacementManager.replaceVariables(description, replacements)

                console.log("hangup:52 after replaceJQLVariables");

                const resDes = await jiraManager.updateIssueDescription(callInfoFromStorage.id, description)

                debugManager.log(debug, [
                    `${timeField}: SipgateHangup Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                    `${timeField}: SipgateHangup Func -> Edited Description: ${description}`
                ])

                if (cause === "normalClearing") {
                    if (queryParameters.closeID && !body.diversion) {
                        const resTrans = await jiraManager.transitionIssue(callInfoFromStorage.id, queryParameters.closeID[0])

                        debugManager.log(debug, [
                            `${timeField}: SipgateHangup Func -> Transsition Response: ${JSON.stringify(resTrans, null, 4)}`
                        ])
                    }

                    debugManager.log(debug, [
                        `${timeField}: SipgateHangup Func -> Call Ended, removing Storage for: ${body.xcid}`
                    ])

                    await storage.delete(body.xcid)
                } else {
                    await storage.set(body.xcid, { ...callInfoFromStorage, description })
                }
            }

            return {
                statusCode: 200
            }
        }
    } catch (error) {
        if (debug.debugOption) {
            debug.debugLog.push(`${timeField}: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

            console.error(`${timeField}: SipgateHangup Func -> Error: ${JSON.stringify(error, null, 4)}`)

            await storage.set("debug", debug)
        }

        return {
            body: error + "  ",
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}
