import xml from "xml"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import api, { fetch, route, storage, webTrigger } from "@forge/api"
import getBodyData from "./lib/getBodyData"
import debugLogging from "./lib/debugLogging"

dayjs.extend(utc)
dayjs.extend(timezone)

function createReplacementMapping({issueConfiguration, body, callActionDate, callInfoFromStorage, tellows}) {
    const replacements = [];

    if (issueConfiguration) {
        replacements.push(
            ["{{$timeField}}", issueConfiguration.timeField],
            ["{{$spamRatingField}}", issueConfiguration.spamRatingField],
            ["{{$cityField}}", issueConfiguration.cityField],
            ["{{$timeField}}", issueConfiguration.timeField]
        );
    }

    if (body) {
        const sipgateUserID = body.userId || body["userId%5B%5D"] || "";
        const sipgateUserName = body.user || body["user%5B%5D"] || "";

        replacements.push(
            ["{{$number}}", `\\u002b${body.from}`],
            ["{{$sipgateUserID}}", sipgateUserID],
            ["{{$sipgateUsername}}", sipgateUserName.replace("+", " ")]
        );

        if (issueConfiguration) {
            replacements.push(["{{$sipgateNumber}}", body.to.replace(issueConfiguration.sipgateNumber, "")]);
        }
    }

    if (callActionDate) {
        if (callInfoFromStorage) {
            const callDuration = callActionDate.diff(dayjs(callInfoFromStorage.date), "s");

            replacements.push(
                ["{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0")],
                ["{{$seconds}}", `${callDuration % 60}`.padStart(2, "0")]
            );
        }
        if (issueConfiguration) {
            replacements.push(
                ["{{$date}}", callActionDate.format(issueConfiguration.dateFormat)],
                ["{{$time}}", callActionDate.format(issueConfiguration.hourFormat)]
            );
        }
    }

    if (tellows) {
        replacements.push(
            ["{{$rating}}", tellows?.tellows?.score || ""],
            ["{{$city}}", tellows?.tellows?.location || ""]
        );
    }

    return replacements;
}

function replaceVariables(textValue, replacements) {
    let result = textValue;

    for (const [variable, replacement] of replacements) {
        result = result.replace(new RegExp(variable, 'g'), replacement);
    }
    return result;
}

let jql;
let jqlQueryCache;
async function replaceJQLVariables(stringToReplace, replacements) {
    if (!jql){
        jql = await storage.get("jql");
    }

    if (jql.queriesAmount > 0) {
        for await (let { query, variable, defaultValue } of jql.queries) {
            if (query.length > 0) {
                const jqlQueryString = replaceVariables(query, replacements);

                if (!jqlQueryCache[jqlQueryString]){
                    const jqlQueryRaw = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jqlQueryString}`, {
                        headers: {
                            "Accept": "application/json"
                        }
                    });
                    jqlQueryCache[jqlQueryString] = await jqlQueryRaw.json();
                }

                defaultValue = replaceVariables(defaultValue, replacements);

                stringToReplace = stringToReplace.replace(variable, jqlQueryCache[jqlQueryString]?.issues?.[0]?.fields?.summary ? jqlQueryCache[jqlQueryString].issues[0].fields.summary : defaultValue);
            }
        }
    }
    return stringToReplace;
}

export async function SipgateCall(req) {
    const issueConfiguration = await storage.get("issueConfiguration")
    const debug = await storage.get("debug")
    const debugOption = debug.debugOption
    const debugLog = debug.debugLog
    const callStartedDate = dayjs().tz(issueConfiguration.timezone)
    const time = callStartedDate.format(issueConfiguration.hourFormat)
    const timeField = replaceVariables(issueConfiguration.timeField, [
        ["{{$time}}", time]
    ])

    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const callLogConfiguration = await storage.get("callLogConfiguration")

        debugLogging(debugOption, debugLog, [
            `${timeField}: SipgateCall Func -> ${body.diversion ? "Redirection Call" : "Creating Issue"}`,
            `${timeField}: SipgateCall Func -> Body Data: ${JSON.stringify(body, null, 4)}`,
            `${timeField}: SipgateCall Func -> Query Parameters: ${JSON.stringify(queryParameters, null, 4)}`
        ])

        if (body.to?.length > 3) { //ist es ein interner call
            if (body.direction === "in") { //ist es ein eingehender CALL

                //@todo check if tellow is enabled
                let tellows;
                if (true){
                    const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)
                    tellows = await tellowsRaw.json();
                }

                const answerURL = await webTrigger.getUrl("sipgateAnswer")
                const hangupURL = await webTrigger.getUrl("sipgateHangup")
                const callInfoFromStorage = await storage.get(body.xcid)

                if (body.diversion && callInfoFromStorage) {
                    const replacements = createReplacementMapping({
                        issueConfiguration,
                        body,
                        callActionDate: callStartedDate,
                        callInfoFromStorage,
                        tellows
                    });

                    let description = `${callLogConfiguration?.redirectedCall ? `\n${callLogConfiguration.redirectedCall}` : ""}`;
                    description = replaceVariables(`${callInfoFromStorage.description}${description}`, replacements);

                    const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${callInfoFromStorage.id}`, {
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
                                            text: description,
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
                        `${timeField}: SipcateCall Func -> Edited Issue Response: ${JSON.stringify(resDes, null, 4)}`,
                        `${timeField}: SipcateCall Func -> Edited Description: ${description}`
                    ])

                    await storage.set(body.xcid, { ...callInfoFromStorage, description: description })
                } else { //new incomming call
                    var summary = issueConfiguration.summary
                    var description = `${issueConfiguration.description}\n${callLogConfiguration.incommingCall}`

                    const replacements = createReplacementMapping({
                        issueConfiguration,
                        body,
                        callActionDate: callStartedDate,
                        callInfoFromStorage,
                        tellows
                    });

                    summary = await replaceJQLVariables(summary, replacements);
                    description = await replaceJQLVariables(description, replacements);

                    summary = replaceVariables(summary, replacements);
                    description = replaceVariables(description, replacements);

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipcateCall Func -> Issue Summary: ${summary}`,
                        `${timeField}: SipcateCall Func -> Issue Description: ${description}`
                    ])

                    const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
                        method: "POST",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                summary,
                                issuetype: { id: queryParameters.issueID[0] },
                                project: { key: queryParameters.project[0] },
                                [`customfield_${queryParameters.phoneField[0]}`]: `+${body.from}`,
                                description: {
                                    content: [{
                                        content: [{
                                            text: description,
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
                    const issue = await issueRaw.json()

                    debugLogging(debugOption, debugLog, [
                        `${timeField}: SipcateCall Func -> Raw Issue Data: ${JSON.stringify(issueRaw, null, 4)}`,
                        `${timeField}: SipcateCall Func -> JSON Issue Data: ${JSON.stringify(issue, null, 4)}`
                    ])

                    await storage.set(body.xcid, { id: issue.id, description })
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
        if (debugOption) {
            debugLog.push(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            console.error(`${timeField}: SipcateCall Func -> Error: ${JSON.stringify(err, null, 4)}`)

            await storage.set("debug", { debugOption, debugLog })
        }

        return {
            body: err + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}
