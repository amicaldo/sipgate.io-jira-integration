import xml from "xml"
import dayjs from "dayjs"
import api, { fetch, route, startsWith, storage, webTrigger } from "@forge/api"
import ForgeUI, { render, AdminPage, useState, useEffect, Cell, Fragment, Form, Head, Heading, Row, SectionMessage, Strong, Table, Tab, Tabs, Text, TextField, User } from "@forge/ui"

function cutNumber(number) {
    return `${number}`.replace("49231449955", "")
}

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
    const issueSubmit = async formData => {
        await storage.set("issueSummary", formData.issueSummary)
        await storage.set("spamRatingField", formData.spamRatingField)
        await storage.set("cityField", formData.cityField)
        await storage.set("closeID", formData.closeID)

        setIssueConfig([formData.issueSummary, formData.spamRatingField, formData.cityField, formData.closeID])
    }
    const generatorSubmit = async formData => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&phoneField=${formData.cField1}&issueID=${formData.issueID}`

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
            <Text>
                Welcome to the configuration UI for your Sipgate + JIRA integration!
                We will create one ticket for each incomming call. Here, you can customize the format of each ticket created for incoming calls.
            </Text>
            <Tabs>
                <Tab label="Issue Configuration">
                    <SectionMessage title="About">
                        <Text>
                            This tab allows you to configure the issue design. Here you can configure what the tool should output and what not.
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
                                    <Text><Strong>issueSummary</Strong>: {`This field specifies the summary of the issue for the ticket. If left blank, it will default to "Anruf von {{$numberOrName}} {{$spamRatingField}} {{$cityField}}  - {{$date}} - {{$time}} Uhr", where {{$numberOrName}} represents the caller's number or name, {{$spamRatingField}} represents the spam rating, {{$cityField}} represents the caller's city, and {{$date}} and {{$time}} represent the date and time of the call.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="issueSummary" type="text" isRequired defaultValue={issueConfig[0]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>spamRating</Strong>: {`This field specifies the spam rating for the ticket. If left blank, it will default to " (Rate: {{ $rating }})", where {{ $rating }} represents the spam rating.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="spamRatingField" type="text" isRequired defaultValue={issueConfig[1]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>cityField</Strong>: {`This field specifies the caller's city for the ticket. If left blank, it will default to " aus {{ $city }}", where {{ $city }} represents the caller's city.`}</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="cityField" type="text" isRequired defaultValue={issueConfig[2]} />
                                </Cell>
                            </Row>
                            <Row>
                                <Cell>
                                    <Text><Strong>closeID</Strong>: This field specifies the workflow trigger to execute onHangup</Text>
                                </Cell>
                                <Cell>
                                    <TextField name="closeID" type="number" isRequired defaultValue={issueConfig[3]} />
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
            const answerURL = await webTrigger.getUrl("sipgateAnswer")
            const hangupURL = await webTrigger.getUrl("sipgateHangup")
            const dateData = dayjs().add(2, "hour")
            const time = dateData.format("HH:mm:ss")

            console.log(body)

            if (!body.diversion) {
                const queryParameters = req.queryParameters
                const tellowsRaw = await fetch(`https://www.tellows.de/basic/num/+${body.from}?json=1`)
                const tellows = await tellowsRaw.json()
                const issueSummary = await storage.get("issueSummary")
                const spamRatingField = await storage.get("spamRatingField")
                const cityField = await storage.get("cityField")
                const description = `${time} Uhr: Eingehender Anruf auf - ${cutNumber(body.to)}.`
                let summary = `${issueSummary}`
                    .replace("{{$numberOrName}}", `+${body.from}`)
                    .replace("{{$spamRatingField}}", tellows?.tellows?.score ? `${spamRatingField}`.replace("{{$rating}}", tellows.tellows.score) : "")
                    .replace("{{$cityField}}", tellows?.tellows?.location ? `${cityField}`.replace("{{$city}}", tellows.tellows.location) : "")
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

                await storage.set(body.xcid, { id: issue.id, description })
            }
            else {
                const data = await storage.get(body.xcid)
                const user = body.user ? body.user : body["user%5B%5D"] ? body["user%5B%5D"] : ""

                if (data) {
                    const description = `${data.description}\n${time} Uhr: Anruf weitergeleitet zu ${user.replace("+", " ")}.`

                    await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
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

                    await storage.set(body.xcid, { ...data, description })
                }
            }

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
    } catch (error) {
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
            const accountId = await storage.get(`sipgate_id_${Array.isArray(userID) ? userID[0] : userID}`)

            console.log(body)

            if (data) {
                const description = `${data.description}\n${dateData.format("HH:mm:ss")} Uhr: Anruf angenommen von ${user.replace("+", " ")}.`

                await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
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

                await storage.set(body.xcid, { ...data, description, date: dateData.toJSON() })

                if (accountId) {
                    await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/assignee`, {
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
            }

            return {
                headers: { "Content-Type": ["application/json"] },
                body: "",
                statusCode: 200,
                statusText: "OK"
            }
        }
    } catch (error) {
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
            const dateData = dayjs().add(2, "hour")
            const time = `\n${dateData.format("HH:mm:ss")} Uhr: `
            let description

            console.log(body)

            if (cause === "normalClearing") {
                const closeID = await storage.get("closeID")

                if (data) {
                    const callDuration = dateData.diff(dayjs(data.date), "s")

                    description = `${data.description}${time}Anruf aufgelegt.\n\nAnrufdauer: ${`${Math.floor(callDuration / 60)}`.padStart(2, "0")}:${`${callDuration % 60}`.padStart(2, "0")} Minuten.`

                    if (closeID && !body.diversion) {
                        await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}/transitions`, {
                            method: "POST",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                transition: { "id": closeID }
                            })
                        })
                    }
                }
            }
            else if (cause === "busy") {
                description = `${data.description}${time}Der Anruf wurde beendet da die angerufene Person beschäftigt war.`
            }
            else if (cause === "cancel") {
                description = `${data.description}${time}Der Anruf wurde beendet bevor eine Person ran gehen konnte.`
            }
            else if (cause === "noAnswer") {
                description = `${data.description}${time}Der Anruf wurde beendet da die angerufene Person diesen abgelehnt hat.`
            }
            else if (cause === "congestion") {
                description = `${data.description}${time}Der Anruf wurde beendet da die angerufene Person nicht erreichbar war.`
            }
            else if (cause === "notFound") {
                description = `${data.description}${time}Der Anruf wurde beendet da entweder die angerufene Telefonnummer nicht existiert oder diese Person nicht online ist.`
            }

            if (description) {
                await api.asApp().requestJira(route`/rest/api/3/issue/${data.id}`, {
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
            }

            if (!body.diversion) {
                console.log("DELETE")

                await storage.delete(body.xcid)
            }

            return {
                headers: { "Content-Type": ["application/json"] },
                body: "",
                statusCode: 200,
                statusText: "OK"
            }
        }
    } catch (error) {
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
