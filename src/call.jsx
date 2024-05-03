import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import { parsePhoneNumber } from 'libphonenumber-js';
import { fetch, storage, webTrigger } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import JIRAManager from "./lib/JIRAManager"
import ReplacementManager from "./lib/ReplacementManager"
import DebugManager from "./lib/debugManager"

dayjs.extend(utc)
dayjs.extend(timezone)

export async function handleIncommingCall(req) {
    const queryParameters = req.queryParameters
    const body = getBodyData(req.body)

    console.log("NEUER eingehender call; handleIncommingCall", body);
    console.log("Send request to", decodeURIComponent(queryParameters.createIssuePostURL[0])+ `?project=${queryParameters.project[0]}&phoneField=${queryParameters.phoneField[0]}&issueID=${queryParameters.issueID[0]}&closeID=${queryParameters.closeID[0]}`);

    fetch(decodeURIComponent(queryParameters.createIssuePostURL[0])+ `?project=${queryParameters.project[0]}&phoneField=${queryParameters.phoneField[0]}&issueID=${queryParameters.issueID[0]}&closeID=${queryParameters.closeID[0]}`, {
        method: 'POST',
        headers: { "Content-Type": ["application/json"] },
        body: JSON.stringify(body)
    }).then()

    const answerURL = `${decodeURIComponent(queryParameters.onSipgateReturn[0])}?webhookEvent=onAnswer`
    const hangupURL = `${decodeURIComponent(queryParameters.onSipgateReturn[0])}?webhookEvent=onHangup&closeID=${queryParameters.closeID[0]}`

    console.log("fetch send let return a response",xml({
        Response: [
            { _attr: { onAnswer: answerURL } },
            { _attr: { onHangup: hangupURL } }
        ]
    }));

    return {
        headers: { "Content-Type": ["application/xml"] },
        body: xml({
            Response: [
                { _attr: { onAnswer: answerURL } },
                { _attr: { onHangup: hangupURL } }
            ]
        }),
        statusCode: 200,
        statusText: "OK"
    }
}

export async function SipgateCall(req) {
    const [issueConfiguration, debug] =
        await Promise.all(
            [
                storage.get("issueConfiguration"),
                storage.get("debug")
            ]);

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

        try {
            if (!body.from.startsWith('+')){
                body.from = "+"+body.from;
            }
            console.log("try to parse", body.from);
            const formattedPhoneNumber = parsePhoneNumber(body.from);
            if (formattedPhoneNumber) {
                //Die Telefonnummer im internationalen Format formatieren = +49 0000 0000
                body.from = formattedPhoneNumber.formatInternational();
                console.log("parsed phone number successful", body.from);
            }
        } catch(e){
            console.log("parse of phone number not successful",body.from, e);
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

                const answerURL = `${decodeURIComponent(queryParameters.onSipgateReturn[0])}?webhookEvent=onAnswer`
                const hangupURL = `${decodeURIComponent(queryParameters.onSipgateReturn[0])}?webhookEvent=onHangup&closeID=${queryParameters.closeID[0]}`

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

                try {
                    console.log("answerURL", answerURL);
                    console.log("hangupURL", hangupURL);
                    console.log("queryParametersCloseID", queryParameters.closeID[0]);

                    console.log({
                        headers: { "Content-Type": ["application/xml"] },
                        body: `<?xml version="1.0" encoding="UTF-8"?><Response onAnswer="${answerURL}" onHangup="${hangupURL}" />`,
                        statusCode: 200,
                        statusText: "OK"
                    });
                }
                catch (e) {
                    console.log("error on response generation", e);
                }



                return {
                    headers: { "Content-Type": ["application/xml"] },
                    body: `<?xml version="1.0" encoding="UTF-8"?><Response onAnswer="${answerURL}" onHangup="${hangupURL}" />`,
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
