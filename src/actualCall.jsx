import { fetch, storage } from '@forge/api';
import dayjs from 'dayjs';
import JiraManager from './lib/jiraManager';
import ReplacementManager from './lib/replacementManager';
import DebugManager from './lib/debugManager';
import getBodyData from './lib/getBodyData';
import { parsePhoneNumber } from 'libphonenumber-js';

export async function SipgateCall(req) {
    console.log("Request on SipgateCall")
    const [issueConfiguration, debug] =
        await Promise.all(
            [
                storage.get("issueConfiguration"),
                storage.get("debug")
            ]);

    const callStartedDate = dayjs().tz(issueConfiguration.timezone)

    const jiraManager = new JiraManager()
    const replacementManager = new ReplacementManager()
    const debugManager = new DebugManager()

    const time = callStartedDate.format(issueConfiguration.hourFormat)
    const timeField = ReplacementManager.replaceVariables(issueConfiguration.timeField, [
        ["{{$time}}", time]
    ])

    try {
        const body = JSON.parse(req.body)
        console.log("body", body, req.body);

        try {
            if (!body.from.startsWith('+')) {
                body.from = "+" + body.from;
            }
            console.log("try to parse", body.from);
            const formattedPhoneNumber = parsePhoneNumber(body.from);
            if (formattedPhoneNumber) {
                //Die Telefonnummer im internationalen Format formatieren = +49 0000 0000
                body.from = formattedPhoneNumber.formatInternational();
                console.log("parsed phone number successful", body.from);
            }
        } catch (e) {
            console.log("parse of phone number not successful", body.from, e);
        }


        const queryParameters = req.queryParameters
        const callLogConfiguration = await storage.get("callLogConfiguration")

        debugManager.log(debug, [
            `${timeField}: SipgateCall Func -> ${body.diversion ? "Redirection Call" : "Creating Issue"}`,
            `${timeField}: SipgateCall Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
            `${timeField}: SipgateCall Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
        ])

        if (body.to?.length > 3) { //ist es ein interner call
            console.log("not internal call because lenght is > 3", body.to?.length);
            if (body.direction === "in") { //ist es ein eingehender CALL
                var tellows;
                let tellowsResponse;

                if (issueConfiguration.tellows) {
                    try {
                        const encodedPhoneNumber = encodeURIComponent(body.from);
                        const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/${encodedPhoneNumber}?json=1`)
                        tellowsResponse = await tellowsRaw.text()
                        tellowsResponse = tellowsResponse.replace('Partner Data not correct', '');
                        tellows = JSON.parse(tellowsResponse)
                    } catch (e) {
                        console.log("Tellow API not accessible", e);
                    }
                }

                const callInfoFromStorage = await storage.get(body.xcid)

                console.log("create replacement mapping. call.jsx - 53", body.from);
                const replacements = replacementManager.createReplacementMapping({
                    issueConfiguration,
                    body,
                    callActionDate: callStartedDate,
                    callInfoFromStorage,
                    tellows
                })

                if (body.diversion && callInfoFromStorage) { //call is redirected or call is unknown
                    var description = `${callInfoFromStorage.description}${callLogConfiguration?.redirectedCall ? `\n${callLogConfiguration.redirectedCall}` : ""}`

                    description = await jiraManager.replaceJQLVariables(description, replacements)
                    description = ReplacementManager.replaceVariables(description, replacements)

                    const resDes = await jiraManager.updateIssueDescription(callInfoFromStorage.id, description)

                    debugManager.log(debug, [
                        `${timeField}: SipcateCall Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                        `${timeField}: SipcateCall Func -> Edited Description: ${description}`
                    ])

                    await storage.set(body.xcid, { ...callInfoFromStorage, description })
                } else { //new incomming call
                    console.log("detected new incomming call", body.from);
                    var summary = issueConfiguration.summary
                    var description = `${issueConfiguration.description}\n${callLogConfiguration.incommingCall}`

                    console.log("on before jiraManager.replaceJQLVariables - summary");
                    summary = await jiraManager.replaceJQLVariables(summary, replacements)
                    console.log("on before jiraManager.replaceVariables", summary);
                    summary = ReplacementManager.replaceVariables(summary, replacements)
                    console.log("on after jiraManager.replaceJQLVariables - summary", summary);

                    console.log("on before jiraManager.replaceJQLVariables - description", description);
                    description = await jiraManager.replaceJQLVariables(description, replacements)
                    description = ReplacementManager.replaceVariables(description, replacements)
                    console.log("on after jiraManager.replaceJQLVariables - description", description);

                    debugManager.log(debug, [
                        `${timeField}: SipcateCall Func -> Issue Summary: ${summary}`,
                        `${timeField}: SipcateCall Func -> Issue Description: ${description}`
                    ])

                    // let issueJSON = jiraManager
                    //     .createIssue(summary, description, queryParameters.issueID[0], queryParameters.project[0], queryParameters.phoneField[0], body.from)
                    //     .then(async issueJSON => {
                    //             debugManager.log(debug, [
                    //                 `${timeField}: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issueJSON, null, 4)}`
                    //             ])
                    //             await storage.set(body.xcid, {id: issueJSON.id, description})
                    //         },
                    //         async rejected => {
                    //             console.error(`${timeField}: SipcateCall Func -> Real Error: ${JSON.stringify(rejected, null, 4)}`)
                    //             debug.debugLog.push(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(rejected, null, 4)}`)
                    //             await storage.set("debug", debug)
                    //         })

                    try {
                        const issueJSON = await jiraManager
                            .createIssue(summary, description, queryParameters.issueID[0], queryParameters.project[0], queryParameters.phoneField[0], body.from)
                        debugManager.log(debug, [
                            `${timeField}: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issueJSON, null, 4)}`
                        ])
                        await storage.set(body.xcid, { id: issueJSON.id, description })
                    } catch (e) {
                        console.log("Error creating jira issue", e);
                    }
                }

                return {
                    statusCode: 200
                }
            }
        }
    } catch (err) {
        if (debug.debugOption) {
            debug.debugLog.push(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            console.error(`${timeField}: SipcateCall Func -> Error:`, err)

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
