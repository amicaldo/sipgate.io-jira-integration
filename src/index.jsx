import xml from "xml"
import dayjs from "dayjs"
import api, { fetch, route, startsWith, storage, webTrigger } from "@forge/api"
import ForgeUI, { render, AdminPage, Form, Fragment, Heading, Text, TextField, useState, useEffect, User } from "@forge/ui"

function getBodyData(body) {
    let obj = {}

    body.split("&").forEach(function (part) {
        var item = part.split("=")

        obj[item[0]] = decodeURIComponent(item[1])
    });

    return obj
}

function App() {
    const [issueConfig, setIssueConfig] = useState([])
    const [webTriggerURL, setWebTriggerURL] = useState("")
    const [users, setUsers] = useState([])
    const issueSubmit = formData => {
        storage.set("issueSummary", formData.issueSummary)
        storage.set("spamRatingField", formData.spamRatingField)
        storage.set("cityField", formData.cityField)
        storage.set("closeID", formData.closeID)

        setIssueConfig([formData.issueSummary, formData.spamRatingField, formData.cityField, formData.closeID])
    }
    const generatorSubmit = async formData => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&handyField=${formData.cField1}&phoneField=${formData.cField2}&issueID=${formData.issueID}`

        setWebTriggerURL(url)
    }
    const userSubmit = formData => {
        let usersCopy = [...users]

        for (const [atlassianID, sipgateID] of Object.entries(formData)) {
            if (sipgateID.length > 0) {
                const dataIndex = usersCopy.findIndex(user => user.accountId === atlassianID)

                if (dataIndex !== -1) {
                    usersCopy[dataIndex] = { ...usersCopy[dataIndex], sipgateID }

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
        const issueSummary = await storage.get("issueSummary")
        const spamRatingField = await storage.get("spamRatingField")
        const cityField = await storage.get("cityField")
        const closeID = await storage.get("closeID")
        let storageData = []
        let usersArr = []
        let cursor = ""

        for (let i = 0; i < dataLength; i++) {
            const storageDataPull = await storage.query().where("key", startsWith("sipgate_id_")).limit(20).cursor(cursor).getMany()

            storageData.push(...storageDataPull.results)
            cursor = storageDataPull.nextCursor
        }

        usersFiltered.forEach(({ accountId }) => {
            usersArr.push({
                accountId
            })
        })

        storageData.forEach(async ({ key: sipgateID, value: accountId }) => {
            const dataIndex = usersArr.findIndex(user => user.accountId === accountId)

            if (dataIndex !== -1) {
                usersArr[dataIndex] = { ...usersArr[dataIndex], sipgateID: sipgateID.replace("sipgate_id_", "") }
            }
            else {
                await storage.delete(sipgateID)
            }
        })

        setUsers(usersArr)
        setIssueConfig([
            issueSummary ? issueSummary : "Anruf von {{$numberOrName}}{{$spamRatingField}}{{$cityField}} - {{$date}} - {{$time}} Uhr",
            spamRatingField ? spamRatingField : " (Rate: {{$rating}})",
            cityField ? cityField : " aus {{$city}}",
            closeID ? closeID : ""
        ])
    }, [])

    return (
        <Fragment>
            <Heading>Issue Configuration</Heading>
            <Form onSubmit={issueSubmit}>
                <TextField name="issueSummary" type="text" isRequired defaultValue={issueConfig[0]} description="" />
                <TextField name="spamRatingField" type="text" isRequired defaultValue={issueConfig[1]} />
                <TextField name="cityField" type="text" isRequired defaultValue={issueConfig[2]} />
                <TextField name="closeID" type="number" isRequired defaultValue={issueConfig[3]} />
            </Form>
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
    )
}

export async function SipgateCall(req) {
    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const answerURL = await webTrigger.getUrl("sipgateAnswer")
        const hangupURL = await webTrigger.getUrl("sipgateHangup")
        const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/${body.from}?json=1`)
        const tellows = await tellowsRaw.json()
        const issueSummary = await storage.get("issueSummary")
        const spamRatingField = await storage.get("spamRatingField")
        const cityField = await storage.get("cityField")
        let summary = `${issueSummary}`
            .replace("{{$numberOrName}}", `+${body.from}`)
            .replace("{{$spamRatingField}}", tellows?.tellows?.score ? `${spamRatingField}`.replace("{{$rating}}", tellows.tellows.score) : "")
            .replace("{{$cityField}}", tellows?.tellows?.location ? `${cityField}`.replace("{{$city}}", tellows.tellows.location) : "")
            .replace("{{$date}}", dayjs().add(2, "hour").format("DD.MM.YY"))
            .replace("{{$time}}", dayjs().add(2, "hour").format("HH:mm"))

        const issueRaw = await api.asApp().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    summary,
                    issuetype: {
                        id: queryParameters.issueID[0]
                    },
                    project: {
                        key: queryParameters.project[0]
                    },
                    [`customfield_${queryParameters.handyField[0]}`]: "",
                    [`customfield_${queryParameters.phoneField[0]}`]: body.from
                }
            })
        })
        const issue = await issueRaw.json()

        return {
            headers: { "Content-Type": ["application/xml"] },
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
    try {
        const body = getBodyData(req.body)
        const queryParameters = req.queryParameters
        const accountId = await storage.get(`sipgate_id_${Array.isArray(body.userId) ? body.userId[0] : body.userId}`)

        if (accountId) {
            await api.asApp().requestJira(route`/rest/api/3/issue/${queryParameters.issueID}/assignee`, {
                method: "PUT",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    accountId
                })
            })
        }
        return {
            headers: { "Content-Type": ["application/json"] },
            body: "",
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

export async function SipgateHangup(req) {
    try {
        const body = getBodyData(req.body)

        if (body.cause === "normalClearing") {
            const queryParameters = req.queryParameters
            const closeID = await storage.get("closeID")

            await api.asApp().requestJira(route`/rest/api/3/issue/${queryParameters.issueID}/transitions`, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    transition: {"id": closeID}
                })
            });

            return {
                headers: { "Content-Type": ["application/json"] },
                body: "",
                statusCode: 200,
                statusText: "OK"
            }
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

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
)