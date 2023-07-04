import xml from "xml"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { fetch, storage, webTrigger } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import JIRAManager from "./lib/JIRAManager"
import ReplacementManager from "./lib/ReplacementManager"
import DebugManager from "./lib/debugManager"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function SipgateCall(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const callStartedDate = dayjs().tz(issueConfiguration.timezone)

    const jiraManager = new JIRAManager()
    const replacementManager = new ReplacementManager()
    const debugManager = new DebugManager()

    const time = callStartedDate.format(issueConfiguration.hourFormat)
    const timeField = ReplacementManager.replaceVariables(issueConfiguration.timeField, [
        ["{{$time}}", time]
    ])

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const callLogConfiguration = await storage.get("callLogConfiguration")

        debugManager.log(debug, [
            `${timeField}: SipgateCall Func -> ${body.diversion ? "Redirection Call" : "Creating Issue"}`,
            `${timeField}: SipgateCall Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
            `${timeField}: SipgateCall Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
        ])

        if (body.to?.length > 3) { //ist es ein interner call
            if (body.direction === "in") { //ist es ein eingehender CALL
                //@todo check if tellow is enabled
                var tellows

                if (true) {
                    const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)

                    tellows = await tellowsRaw.json()
                }

                const answerURL = await webTrigger.getUrl("sipgateAnswer")
                const hangupURL = await webTrigger.getUrl("sipgateHangup")
                const callInfoFromStorage = await storage.get(body.xcid)

                const replacements = replacementManager.createReplacementMapping({
                    issueConfiguration,
                    body,
                    callActionDate: callStartedDate,
                    callInfoFromStorage,
                    tellows
                })

                if (body.diversion && callInfoFromStorage) { //call is redirected or call is unknown
                    var description = `${callInfoFromStorage.description}${callLogConfiguration?.redirectedCall ? `\n${callLogConfiguration.redirectedCall}` : ""}`

                    description = ReplacementManager.replaceJQLVariables(description, replacements)
                    description = ReplacementManager.replaceVariables(description, replacements)

                    const resDes = jiraManager.updateIssueDescription(callInfoFromStorage.id, description)

                    debugManager.log(debug, [
                        `${timeField}: SipcateCall Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                        `${timeField}: SipcateCall Func -> Edited Description: ${description}`
                    ])

                    await storage.set(body.xcid, { ...callInfoFromStorage, description })
                } else { //new incomming call
                    var summary = issueConfiguration.summary
                    var description = `${issueConfiguration.description}\n${callLogConfiguration.incommingCall}`

                    summary = await jiraManager.replaceJQLVariables(summary, replacements)
                    summary = ReplacementManager.replaceVariables(summary, replacements)

                    description = await jiraManager.replaceJQLVariables(description, replacements)
                    description = ReplacementManager.replaceVariables(description, replacements)

                    debugManager.log(debug, [
                        `${timeField}: SipcateCall Func -> Issue Summary: ${summary}`,
                        `${timeField}: SipcateCall Func -> Issue Description: ${description}`
                    ])

                    const issueJSON = await jiraManager.createIssue(summary, description, queryParameters.issueID[0], queryParameters.project[0], queryParameters.phoneField[0], body.from)

                    debugManager.log(debug, [
                        `${timeField}: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issueJSON, null, 4)}`
                    ])

                    await storage.set(body.xcid, { id: issueJSON.id, description })
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
        if (debug.debugOption) {
            debug.debugLog.push(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            console.error(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            await storage.set("debug", debug)
        }

        return {
            body: err + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}
