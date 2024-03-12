import api, { route, storage } from "@forge/api";
import ReplacementManager from "./ReplacementManager"


export default class JIRAManager {
    _jql
    _jqlQueryCache = {}

    async replaceJQLVariables(stringToReplace, replacements) {
        if (!this._jql) {
            this._jql = await storage.get("jql")
        }



        console.log("this._jql", this._jql);
        if (this._jql.enabled && this._jql.queriesAmount > 0) {
            console.log("JQL is enabled");
            for (let { query, variable, defaultValue } of this._jql.queries) {
                if (query.length > 0 || !!query || !!variable || !!defaultValue ) {
                    console.log("QueryLink is > 0. Replacements:", replacements);
                    if (stringToReplace.indexOf(variable) > -1) {
                        const jqlQueryString = ReplacementManager.replaceVariables(query, replacements)

                        if (!this._jqlQueryCache[variable]) {
                            console.log("doing jql query against jira", jqlQueryString);
                            const jqlQueryRaw = await api.asApp().requestJira(route`/rest/api/3/search?jql=${jqlQueryString}`, {
                                headers: {
                                    "Accept": "application/json"
                                }
                            })

                            console.log("hatta gemacht", jqlQueryRaw);

                            let queryResult = await jqlQueryRaw.json();
                            // variable = {{$callerName}}
                            this._jqlQueryCache[variable] = queryResult

                            console.log("jqlQueryRaw was valid json", queryResult);
                        }

                        try {
                            defaultValue = ReplacementManager.replaceVariables(defaultValue, replacements)
                        }
                        catch(e) {
                            console.log("replaceVariables cathed error", e);
                        }

                        console.log("wir haben eine default value", defaultValue, "hier kommt der stringToReplace: ", stringToReplace);

                        stringToReplace = stringToReplace.replace(variable, this._jqlQueryCache[variable]?.issues?.[0]?.fields?.summary ? this._jqlQueryCache[variable].issues[0].fields.summary : defaultValue)

                        console.log("nochmal stringToReplace", stringToReplace);
                    }
                }
            }
        }

        return stringToReplace
    }

    async createIssue(summary, description, issueTypeID, projectID, customPhoneFieldID, callerNumber) {
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
        return await issueRaw.json()
    }

    async updateIssueDescription(issueID, description) {
        const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}`, {
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

        return resDes
    }

    async assignUser(issueID, accountID) {
        const resAs = await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}/assignee`, {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: `{"accountId": "${accountID}"}`
        })

        return resAs
    }

    async transitionIssue(issueID, transitionID) {
        const resTrans = await api.asApp().requestJira(route`/rest/api/3/issue/${issueID}/transitions`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ transition: { "id": transitionID } })
        })

        return resTrans
    }
}
