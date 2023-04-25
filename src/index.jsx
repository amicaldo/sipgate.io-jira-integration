import xml from "xml"
import dayjs from "dayjs"
import api, { fetch, route, startsWith, storage, webTrigger } from "@forge/api"
import ForgeUI, { render, AdminPage, useState, useEffect, Cell, Fragment, Form, Head, Heading, Row, SectionMessage, Strong, Table, Tab, Tabs, Text, TextField, User } from "@forge/ui"

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
    const issueSubmit = async ({ issueSummary, spamRatingField, cityField, incommingCall, redirectedCall, answerCall, normalClearing, callDuration, busy, cancel, noAnswer, congestion, notFound }) => {
        await storage.set("issueConfiguration", { issueSummary, spamRatingField, cityField, incommingCall, redirectedCall, answerCall, normalClearing, callDuration, busy, cancel, noAnswer, congestion, notFound })

        setIssueConfig([issueSummary, spamRatingField, cityField, incommingCall, redirectedCall, answerCall, normalClearing, callDuration, busy, cancel, noAnswer, congestion, notFound])
    }
    const generatorSubmit = async formData => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&phoneField=${formData.cField1}&issueID=${formData.issueID}&closeID=${formData.closeID}`

        setWebTriggerURL(url)
    }
    const userSubmit = async formData => {
        let usersCopy = [...users]

        for (const [atlassianID, sipgateID] of Object.entries(formData)) {
            if (sipgateID.length > 0) {
                const dataIndex = usersCopy.findIndex(user => user.accountId === atlassianID)

                if (dataIndex !== -1) {
                    usersCopy[dataIndex] = { ...usersCopy[dataIndex], sipgateID }

                    await storage.set(`sipgate_id_${sipgateID}`, atlassianID)
                }
            }
        }

        setUsers(usersCopy)
    }

    useEffect(async () => {
        const usersRaw = await api.asApp().requestJira(route`/rest/api/3/users/search?startAt=0&maxResults=500&query=+&includeActive=true&includeInActive=false&productUse=jira-software`, { headers: { "Accept": "application/json" } })
        const usersData = await usersRaw.json()
        const usersFiltered = usersData.filter(user => user.accountType !== "app" && user.active)
        const dataLength = usersFiltered.length > 20 ? Math.ceil(usersFiltered.length / 20) : 1
        let issueConfiguration = await storage.get("issueSummary")
        let storageData = []
        let usersArr = []
        let cursor = ""

        console.log(usersData)

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
            issueConfiguration?.issueSummary ? issueConfiguration.issueSummary : "Anruf von {{$numberOrName}}{{$spamRatingField}}{{$cityField}} - {{$date}} - {{$time}} Uhr",
            issueConfiguration?.spamRatingField ? issueConfiguration.spamRatingField : " (Rate: {{$rating}})",
            issueConfiguration?.cityField ? issueConfiguration.cityField : " aus {{$city}}",
            issueConfiguration?.incommingCall ? issueConfiguration.incommingCall : "{{$time}} Uhr: Eingehender Anruf auf - {{$sipgateNumber}}",
            issueConfiguration?.redirectedCall ? issueConfiguration.redirectedCall : "{{$time}} Uhr: Anruf weitergeleitet zu {{$sipgateUsername}}",
            issueConfiguration?.answerCall ? issueConfiguration.answerCall : "{{$time}} Uhr: Anruf angenommen von {{$sipgateUsername}}",
            issueConfiguration?.normalClearing ? issueConfiguration.normalClearing : "{{$time}} Uhr: Anruf aufgelegt.",
            issueConfiguration?.callDuration ? issueConfiguration.callDuration : "Anrufdauer: {{$minutes}}:{{$seconds}} Minuten.",
            issueConfiguration?.busy ? issueConfiguration.busy : "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person beschäftigt war.",
            issueConfiguration?.cancel ? issueConfiguration.cancel : "{{$time}} Uhr: Der Anruf wurde beendet bevor eine Person ran gehen konnte.",
            issueConfiguration?.noAnswer ? issueConfiguration.noAnswer : "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person diesen abgelehnt hat.",
            issueConfiguration?.congestion ? issueConfiguration.congestion : "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person nicht erreichbar war.",
            issueConfiguration?.notFound ? issueConfiguration.notFound : "{{$time}} Uhr: Der Anruf wurde beendet da entweder die angerufene Telefonnummer nicht existiert oder diese Person nicht online ist.",
        ])
    }, [])

    return (
        <Fragment>
            <Text>
                Welcome to the configuration UI for your Sipgate + JIRA integration!
                We will create one ticket for each incomming call. Here, you can customize the format of each ticket created for incoming calls.
            </Text>
            <Tabs>
                <Tab label="Issue Configuration">
                    <SectionMessage title="About">
                        <Text>
                            This tab allows you to configure the issue design. Here you can configure what the tool should output and what not. You need to atleast have confirmed these settings ONCE, so the API knows what to use for what, otherwise it will not work.
                        </Text>
                    </SectionMessage>
                    <Form onSubmit={issueSubmit}>
                        <Table>
                            <Head>
                                <Cell>
                                    <Heading size="medium">Description</Heading>
                                </Cell>
                                <Cell>
                                    <Heading size="medium">Configuration</Heading>
                                </Cell>
                            </Head>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the summary of the issue for the ticket. The default text is "Anruf von {{$numberOrName}} {{$spamRatingField}}{{$cityField}} - {{$date}} - {{$time}} Uhr", where {{$numberOrName}} represents the caller's number or name, {{$spamRatingField}} represents the spam rating, {{$cityField}} represents the caller's city, and {{$date}} and {{$time}} represent the date and time of the call.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="issueSummary" type="text" isRequired defaultValue={issueConfig[0]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the spam rating for the ticket.The default text is " (Rate: {{$rating}})", where {{$rating}} represents the spam rating.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="spamRatingField" type="text" isRequired defaultValue={issueConfig[1]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the caller's city for the ticket.The default text is " aus {{$city}}", where {{$city}} represents the caller's city.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="cityField" type="text" isRequired defaultValue={issueConfig[2]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the incomming call log entry. The default text is "{{$time}} Uhr: Eingehender Anruf auf - {{$sipgateNumber}}", where {{$time}} represents the time the log entry got created and {{$sipgateNumber}} represents the last digits of the called number.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="incommingCall" type="text" isRequired defaultValue={issueConfig[3]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the redirected call log entry. The default text is "{{$time}} Uhr: Anruf weitergeleitet zu {{$sipgateUsername}}", where {{$time}} represents the time the log entry got created and {{$sipgateUsername}} represents the sipgate user name of the member the call got redirected to.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="redirectedCall" type="text" isRequired defaultValue={issueConfig[4]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the answer call log entry. The default text is "{{$time}} Uhr: Anruf angenommen von {{$sipgateUsername}}", where {{$time}} represents the time the log entry got created and {{$sipgateUsername}} represents the sipgate user name of the member that answered.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="answerCall" type="text" isRequired defaultValue={issueConfig[5]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the call ended log entry. The default text is "{{$time}} Uhr: Anruf aufgelegt.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="normalClearing" type="text" isRequired defaultValue={issueConfig[6]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the call duration log entry. The default text is "Anrufdauer: {{$minutes}}:{{$seconds}} Minuten.", where {{$minute}} represents the minutes the call lasted and {{$seconds}} represents the seconds the call lasted.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="callDuration" type="text" isRequired defaultValue={issueConfig[7]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the occupied log entry. The default text is "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person beschäftigt war.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="busy" type="text" isRequired defaultValue={issueConfig[8]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the hung up log entry. The default text is "{{$time}} Uhr: Der Anruf wurde beendet bevor eine Person ran gehen konnte.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="cancel" type="text" isRequired defaultValue={issueConfig[9]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the rejected call log entry. The default text is "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person diesen abgelehnt hat.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="noAnswer" type="text" isRequired defaultValue={issueConfig[10]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the could not reach call log entry. The default text is "{{$time}} Uhr: Der Anruf wurde beendet da die angerufene Person nicht erreichbar war.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="congestion" type="text" isRequired defaultValue={issueConfig[11]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text>{`This field specifies the could not be found call log entry. The default text is "{{$time}} Uhr: Der Anruf wurde beendet da entweder die angerufene Telefonnummer nicht existiert oder diese Person nicht online ist.", where {{$time}} represents the time the log entry got created.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="notFound" type="text" isRequired defaultValue={issueConfig[12]} />
                                </Cell>
                            </Row>
                        </Table>
                    </Form>
                </Tab>
                <Tab label="Sipgate Webhook Generator">
                    <SectionMessage title="About">
                        <Text>
                            <Strong>Welcome to the Sipgate webhook generator!</Strong> This tool allows you to configure webhooks for each user and line in your Sipgate account, which can be used to create tickets in your chosen project when a call comes in.
                        </Text>
                        <Text>
                            Before you can use this tool, you'll need to purchase the sipgate.io product from Sipgate. Once you've done that, you can configure a webhook for each user and line individually.
                            Please note that you can configure different projects for different incoming queues in your Sipgate account. Additionally, you can set different issue types for different lines or users, which can be useful if you want to create different types of tickets depending on who is receiving the call.
                        </Text>
                        <Text>
                            Once you've filled out the form, click the submit button to generate your webhook link. You can then copy and paste this link into your Sipgate account settings to activate the webhook.
                        </Text>
                        <Text>
                            To generate a webhook link, please fill out the form below. No data is stored its just the helper to create an link:
                        </Text>
                    </SectionMessage>
                    <Form onSubmit={generatorSubmit}>
                        <Table>
                            <Head>
                                <Cell>
                                    <Heading size="medium">Description</Heading>
                                </Cell>
                                <Cell>
                                    <Heading size="medium">Configuration</Heading>
                                </Cell>
                            </Head>
                            <Row>
                                <Cell>
                                    <Text><Strong>projectID:</Strong> This is the ID of the project that you want to create tickets in when a call comes in. This field is required.</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="projectID" isRequired type="text" />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>cField1:</Strong> This is the ID of the field where you want to store the telephone number of the incoming call. This field is required and must be a number.</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="cField1" isRequired type="number" />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>issueID:</Strong> This is the ID of the issue type that you want to create for the incoming call. This field is required and must be a number.</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="issueID" isRequired type="number" />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>closeID</Strong>: This field specifies the workflow trigger to execute onHangup</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="closeID" type="number" isRequired />
                                </Cell>
                            </Row>
                        </Table>
                    </Form>
                    {webTriggerURL && (
                        <Fragment>
                            <Heading>Webhook URL for Sipgate</Heading>
                            <Text>{webTriggerURL}</Text>
                        </Fragment>
                    )}
                </Tab>
                <Tab label="User Configuration">
                    <SectionMessage title="About">
                        <Text>
                            If any user pickup an sipgate call we assign him the created ticket. To link the Sipgate user to their corresponding Jira user, please enter the Sipgate user ID here.
                            You can find this ID in the URL when editing a user in the Sipgate control panel. In this example, the required user ID is "w9":
                            https://app.sipgate.com/w0/users/<Strong>w9</Strong>/routing
                        </Text>
                    </SectionMessage>
                    {users.length > 0 && (
                        <Form onSubmit={userSubmit}>
                            <Table>
                                <Head>
                                    <Cell>
                                        <Heading size="medium">User</Heading>
                                    </Cell>
                                    <Cell>
                                        <Heading size="medium">Sipgate ID</Heading>
                                    </Cell>
                                </Head>
                                {users.map(user => (
                                    <Row>
                                        <Cell>
                                            <User accountId={user.accountId} />
                                        </Cell>
                                        <Cell>
                                            <TextField name={user.accountId} type="text" defaultValue={user.sipgateID || ""} />
                                        </Cell>
                                    </Row>
                                ))}
                            </Table>
                        </Form>
                    )}
                </Tab>
            </Tabs>
        </Fragment>
    )
}

export async function SipgateCall(req) {
    try {
        const body = getBodyData(req.body)

        if (body.direction === "in") {
            const queryParameters = req.queryParameters
            const answerURL = await webTrigger.getUrl("sipgateAnswer")
            const hangupURL = await webTrigger.getUrl("sipgateHangup")
            const issueConfiguration = await storage.get("issueConfiguration")
            const dateData = dayjs().add(2, "hour")
            const time = dateData.format("HH:mm:ss")

            console.log("Call Body Data: ", body)
            console.log("Call Query Parameters: ", queryParameters)

            if (!body.diversion) {
                console.log("Call -> First Call")

                const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)
                const tellows = await tellowsRaw.json()
                const description = `${issueConfiguration?.incommingCall ? issueConfiguration.incommingCall : ""}`
                    .replace("{{$time}}", time)
                    .replace("{{$sipgateNumber}}", body.to.replace("49231449955", ""))
                const summary = `${issueConfiguration?.issueSummary ? issueConfiguration.issueSummary : ""}`
                    .replace("{{$numberOrName}}", `+${body.from}`)
                    .replace("{{$spamRatingField}}", tellows?.tellows?.score ? `${issueConfiguration?.spamRatingField ? issueConfiguration.spamRatingField : ""}`.replace("{{$rating}}", tellows.tellows.score) : "")
                    .replace("{{$cityField}}", tellows?.tellows?.location ? `${issueConfiguration?.cityField ? issueConfiguration.cityField : ""}`.replace("{{$city}}", tellows.tellows.location) : "")
                    .replace("{{$date}}", dateData.format("DD.MM.YY"))
                    .replace("{{$time}}", time)
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
                            [`customfield_${queryParameters.phoneField[0]}`]: `+${body.from}`,
                            description: {
                                content: [
                                    {
                                        content: [
                                            {
                                                text: description,
                                                type: "text"
                                            }
                                        ],
                                        type: "paragraph"
                                    }
                                ],
                                type: "doc",
                                version: 1
                            }
                        }
                    })
                })
                const issue = await issueRaw.json()

                console.log("Call First Call Description: ", description)
                console.log("Call First Call Response: ", issueRaw)
                console.log("Call First Call Issue: ", issue)

                await storage.set(body.xcid, { id: issue.id, description })
            }
            else {
                console.log("Call -> Diversion")

                const data = await storage.get(body.xcid)
                const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""

                if (data) {
                    console.log("Call Diversion Got Data")

                    const description = `${issueConfiguration?.redirectedCall ? `\n${issueConfiguration.redirectedCall}` : ""}`
                        .replace("{{$time}}", time)
                        .replace("{{$sipgateUsername}}", user.replace("+", " "))

                    const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            fields: {
                                description: {
                                    content: [
                                        {
                                            content: [
                                                {
                                                    text: `${data.description}${description}`,
                                                    type: "text"
                                                }
                                            ],
                                            type: "paragraph"
                                        }
                                    ],
                                    type: "doc",
                                    version: 1
                                }
                            }
                        })
                    })

                    console.log("Call Diversion Edit Issue Response: ", resDes)
                    console.log("Call Diversion new Description: ", `${data.description}${description}`)

                    await storage.set(body.xcid, { ...data, description: `${data.description}${description}` })
                }
            }

            return {
                headers: { "Content-Type": ["application/xml"] },
                body: xml({
                    Response: [
                        { _attr: { onAnswer: answerURL } },
                        { _attr: { onHangup: `${hangupURL}?closeID=${queryParameters.closeID[0]}` } }
                    ]
                }),
                statusCode: 200,
                statusText: "OK"
            }
        }
    } catch (error) {
        console.error("Call Error", error)

        return {
            body: error + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}

export async function SipgateAnswer(req) {
    try {
        const body = getBodyData(req.body)

        if (body.direction === "in") {
            const data = await storage.get(body.xcid)
            const dateData = dayjs().add(2, "hour")
            const userID = body.userId ? body.userId : body["userId%5B%5D"] ? body["userId%5B%5D"] : ""
            const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""
            const issueConfiguration = await storage.get("issueConfiguration")
            const accountId = await storage.get(`sipgate_id_${Array.isArray(userID) ? userID[0] : userID}`)

            console.log("Answer Body: ", body)

            if (data) {
                const description = `${issueConfiguration?.answerCall ? `\n${issueConfiguration.answerCall}` : ""}`
                    .replace("{{$time}}", dateData.format("HH:mm:ss"))
                    .replace("{{$sipgateUsername}}", user.replace("+", " "))

                const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
                    method: "PUT",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fields: {
                            description: {
                                content: [
                                    {
                                        content: [
                                            {
                                                text: `${data.description}${description}`,
                                                type: "text"
                                            }
                                        ],
                                        type: "paragraph"
                                    }
                                ],
                                type: "doc",
                                version: 1
                            }
                        }
                    })
                })

                console.log("Answer Edit Issue Response: ", resDes)
                console.log("Answer new Description: ", `${data.description}${description}`)

                await storage.set(body.xcid, { ...data, description: `${data.description}${description}`, date: dateData.toJSON() })

                if (accountId) {
                    console.log("Answer AccountID: ", accountId)

                    const resAs = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/assignee`, {
                        method: "PUT",
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            accountId
                        })
                    })

                    console.log("Answer Assign Response: ", resAs)
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
        console.error("Answer Error:", error)

        return {
            body: error + "  ",
            headers: { "Content-Type": ["application/json"] },
            statusCode: 400,
            statusText: "Bad Request",
        }
    }
}

export async function SipgateHangup(req) {
    try {
        const body = getBodyData(req.body)

        if (body.direction === "in") {
            const cause = body.cause
            const data = await storage.get(body.xcid)
            const issueConfiguration = await storage.get("issueConfiguration")
            const dateData = dayjs().add(2, "hour")
            const time = dateData.format("HH:mm:ss")
            let description

            console.log("Hangup Body: ", body)
            console.log("Hangup Cause: ", cause)

            if (cause === "normalClearing") {
                const queryParameters = req.queryParameters

                if (data) {
                    const callDuration = dateData.diff(dayjs(data.date), "s")

                    description = `${issueConfiguration?.normalClearing ? `\n${issueConfiguration.normalClearing}` : ""}${issueConfiguration?.callDuration ? `\n\n${issueConfiguration.callDuration}` : ""}`
                        .replace("{{$time}}", time)
                        .replace("{{$minutes}}", `${Math.floor(callDuration / 60)}`.padStart(2, "0"))
                        .replace("{{$seconds}}", `${callDuration % 60}`.padStart(2, "0"))

                    if (queryParameters.closeID && !body.diversion) {
                        const resTrans = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/transitions`, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                transition: { "id": queryParameters.closeID[0] }
                            })
                        })

                        console.log("Hangup Transsition Response: ", resTrans)
                    }
                }
            }
            else if (cause !== "forwarded") {
                description = `${issueConfiguration?.[cause] ? `\n${issueConfiguration[cause]}` : ""}`
                    .replace("{{$time}}", time)
            }

            if (description) {
                const resDes = await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
                    method: "PUT",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fields: {
                            description: {
                                content: [
                                    {
                                        content: [
                                            {
                                                text: `${data.description}${description}`,
                                                type: "text"
                                            }
                                        ],
                                        type: "paragraph"
                                    }
                                ],
                                type: "doc",
                                version: 1
                            }
                        }
                    })
                })

                console.log("Hangup Edit Issue Response: ", resDes)
                console.log("Hangup new Description: ", `${data.description}${description}`)

                if (!body.diversion) {
                    console.log("Hangup deleted Storage für XCID: ", body.xcid)

                    await storage.delete(body.xcid)
                }
                else {
                    await storage.set(body.xcid, { ...data, description: `${data.description}${description}` })
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
        console.error("Hangup Error: ", error)

        return {
            body: error + "  ",
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
