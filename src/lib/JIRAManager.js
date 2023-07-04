import api, { route, storage } from "@forge/api";
import ReplacementManager from "./ReplacementManager"


export default class JIRAManager {
    _jql;
    _jqlQueryCache;

    async replaceJQLVariables(stringToReplace, replacements) {

        if (!this._jql) {
            this._jql = await storage.get("jql");
        }

        if (jql.queriesAmount > 0) {
            for await (let { query, variable, defaultValue } of jql.queries) {
                if (query.length > 0) {
                    if (stringToReplace.search(new RegExp(variable)) > -1) {
                        const jqlQueryString = ReplacementManager.replaceVariables(query, replacements);

                        if (!this._jqlQueryCache[jqlQueryString]) {
                            const jqlQueryRaw = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jqlQueryString}`, {
                                headers: {
                                    "Accept": "application/json"
                                }
                            });
                            this._jqlQueryCache[jqlQueryString] = await jqlQueryRaw.json();
                        }

                        defaultValue = ReplacementManager.replaceVariables(defaultValue, replacements);

                        stringToReplace = stringToReplace.replace(variable, this._jqlQueryCache[jqlQueryString]?.issues?.[0]?.fields?.summary ? this._jqlQueryCache[jqlQueryString].issues[0].fields.summary : defaultValue);
                    }
                }
            }
        }
        return stringToReplace;
    }

    async createIssue(
        {
            description,
            issueTypeID,
            projectID,
            customPhoneFieldID,
            callerNumber
        }
    ) {
        const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    summary,
                    issuetype: { id: issueTypeID },
                    project: { key: projectID },
                    [`customfield_${customPhoneFieldID}`]: `+${callerNumber}`,
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
        return await issueRaw.json();
    }

    async updateIssueDescription(issueID, description) {
        return await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}`, {
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
    }

    async assignUser(issueID, accountID) {
        return await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}/assignee`, {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ accountID })
        })
    }

    async transitionIssue(issueID, transitionID) {
        return await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}/transitions`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ transition: { "id": transitionID } })
        })
    }
}
