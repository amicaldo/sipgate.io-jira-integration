import xml from "xml";
import api, { authorize, route, startsWith, storage, webTrigger } from "@forge/api";
import ForgeUI, { render, AdminPage, Form, Fragment, Heading, Text, TextField, useState, useEffect, User } from "@forge/ui";

function getBodyData(body) {
    let obj = {}

    body.split("&").forEach(function (part) {
        var item = part.split("=")

        obj[item[0]] = decodeURIComponent(item[1])
    });

    return obj
}

function App() {
    const [webTriggerURL, setWebTriggerURL] = useState("")
    const [users, setUsers] = useState([])
    const generatorSubmit = async formData => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&handyField=${formData.cField1}&phoneField=${formData.cField2}&issueID=${formData.issueID}`

        setWebTriggerURL(url)
    }
    const userSubmit = async formData => {
        let usersCopy = [...users]

        for (const [atlassianID, sipgateID] of Object.entries(formData)) {
            if (sipgateID.length > 0) {
                const dataIndex = usersCopy.findIndex(user => user.accountId === atlassianID)

                if (dataIndex !== -1) {
                    usersCopy[dataIndex] = {...usersCopy[dataIndex], sipgateID}

                    storage.set(`sipgate_id_${sipgateID}`, atlassianID)
                }
            }
        }

        setUsers(usersCopy)
    }

    useEffect(async () => {
        const usersRaw = await api.asApp().requestJira(route`/rest/api/3/users/search`, { headers: { "Accept": "application/json" } })
        const usersData = await usersRaw.json()
        const usersFiltered = usersData.filter(user => user.accountType !== "app" && user.displayName !== "Former user")
        const dataLength = usersFiltered.length > 20 ? Math.ceil(usersFiltered.length / 20) : 1
        let storageData = []
        let usersArr = []
        let cursor = ""

        for (let i = 0; i <= dataLength; i++) {
            const storageDataPull = await storage.query().where("key", startsWith("sipgate_id_")).limit(20).cursor(cursor).getMany()

            storageData = [...storageData, storageDataPull.results]
            cursor = storageDataPull.nextCursor
        }

        usersFiltered.forEach(({ accountId, displayName }) => {
            usersArr.push({
                accountId,
                displayName
            })
        })

        storageData.forEach(async ({key: sipgateID, value: accountId}) => {
            const dataIndex = usersArr.findIndex(user => user.accountId === accountId)

            if (dataIndex !== -1) {
                usersArr[dataIndex] = {...usersArr[dataIndex], sipgateID: sipgateID.replace("sipgate_id_", "")}
            }
            else {
                await storage.delete(sipgateID)
            }
        })

        setUsers(usersArr)
    }, [])

    return (
        <Fragment>
            <Heading>Sipgate Webhook Generator</Heading>
            <Form onSubmit={generatorSubmit}>
                <TextField name="projectID" isRequired type="text" description="ID of the project" />
                <TextField name="cField1" isRequired type="number" description="ID of the first Custom Field" />
                <TextField name="cField2" isRequired type="number" description="ID of the second Custom Field" />
                <TextField name="issueID" isRequired type="number" description="ID of the issueType" />
            </Form>
            {webTriggerURL && (
                <Fragment>
                    <Heading>Webhook URL for Sipgate</Heading>
                    <Text>{webTriggerURL}</Text>
                </Fragment>
            )}
            {users.length > 0 && (
                <Fragment>
                    <Heading>User Configuration</Heading>
                    <Form onSubmit={userSubmit}>
                        {users.map(user => (
                            <Fragment>
                                <User accountId={user.accountId} />
                                <TextField name={user.accountId} type="text" defaultValue={user.sipgateID || ""} />
                            </Fragment>
                        ))}
                    </Form>
                    <Text>{JSON.stringify(users, null, 4)}</Text>
                </Fragment>
            )}
        </Fragment>
    );
};

export async function SipgateCall(req) {
    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        var answerURL = await webTrigger.getUrl("sipgateAnswer")
        var hangupURL = await webTrigger.getUrl("sipgateHangup")

        const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    summary: `Call from ${body.from}`,
                    issuetype: {
                        id: queryParameters.issueID[0]
                    },
                    project: {
                        key: queryParameters.project[0]
                    },
                    [`customfield_${queryParameters.handyField[0]}`]: "0",
                    [`customfield_${queryParameters.phoneField[0]}`]: body.from
                }
            })
        })
        const issue = await issueRaw.json()

        console.log(issue)

        return {
            headers: { "Content-Type": ["application/json"] },
            body: xml({
                Response: [
                    { _attr: { onAnswer: `${answerURL}?issueID=${issue.id}` } },
                    { _attr: { onHangup: `${hangupURL}?issueID=${issue.id}` } }
                ]
            }),
            statusCode: 200,
            statusText: "OK"
        }
    } catch (error) {
        return {
            body: error + "\n",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}

export async function SipgateAnswer(req) {
    const queryParameters = req.queryParameters
    let canEdit
    let canAssign

    try {
        console.log("Check Auth")

        canEdit = await authorize().onJiraIssue(queryParameters.issueID[0]).canEditIssues()
        canAssign = await authorize().onJiraIssue(queryParameters.issueID[0]).canAssign()

        console.log("After Auth Check")
    } catch (error) {
        console.error(error)
    }

    if (canEdit && canAssign) {
        console.log("Can Edit")

        const response = await api.asApp().requestJira(route`/rest`)
    }
}

export async function SipgateHangup(req) {
    const queryParameters = req.queryParameters
    let canEdit

    try {
        console.log("Check Auth")

        canEdit = await authorize().onJiraIssue(queryParameters.issueID[0]).canEditIssues()

        console.log("After Auth Check")
    } catch (error) {
        console.error(error)
    }

    if (canEdit) {
        const response = await api.asApp().requestJira(route`/rest`)
    }
}

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
