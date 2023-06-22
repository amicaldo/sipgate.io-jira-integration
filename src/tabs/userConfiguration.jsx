import api, { route, startsWith, storage } from "@forge/api"
import ForgeUI, { useEffect, useState, Cell, Code, Form, Head, Heading, SectionMessage, Row, Strong, Table, Tab, Text, TextField, User } from "@forge/ui"

async function getJiraUsers() {
    var startAt = 0
    var usersFiltered = []

    const getUsersData = async () => {
        const usersRaw = await api.asApp().requestJira(route`/rest/api/3/users/search?startAt=${startAt}&maxResults=500`, { headers: { "Accept": "application/json" } })

        return await usersRaw.json()
    }

    while (true) {
        const usersData = await getUsersData()

        usersFiltered.push(...usersData.filter(user => user.accountType === "atlassian" && user.active))

        if (usersData.length < 500) break

        startAt += 500
    }

    return usersFiltered
}

async function getSipgateUsers() {
    var cursor = ""
    var users = []

    while (true) {
        const userStorage = await storage.query().where("key", startsWith("sipgate_id_")).limit(20).cursor(cursor).getMany()

        users.push(...userStorage.results)

        if (userStorage.results.length < 20) break

        cursor = userStorage.cursor
    }

    return users
}

export default function UserConfiguration() {
    const [users, setUsers] = useState([])
    const [debug, setDebug] = useState({})

    useEffect(async () => {
        const jiraUsers = await getJiraUsers()
        const sipgateUsers = await getSipgateUsers()
        var usersArr = []

        sipgateUsers.forEach(async ({key: sipgateID, value: accountID}) => {
            const jiraFind = jiraUsers.find(user => user.accountId === accountID)

            if (jiraFind) {
                usersArr.push({accountID: jiraFind.accountId, sipgateID: sipgateID.replace("sipgate_id_", "")})
            }
            else {
                await storage.delete(sipgateID)
            }
        })

        setUsers(usersArr)
        setDebug({
            jiraUsers,
            sipgateUsers,
            usersArr
        })
    }, [])

    return (
        <Tab label="User Configuration">
            <SectionMessage title="About">
                <Text>
                    If any user pickup an sipgate call we assign him the created ticket. To link the Sipgate user to their corresponding Jira user, please enter the Sipgate user ID here.
                    You can find this ID in the URL when editing a user in the Sipgate control panel. In this example, the required user ID is "w9":
                    https://app.sipgate.com/w0/users/<Strong>w9</Strong>/routing
                </Text>
            </SectionMessage>
            {users.length > 0 && (
                <Form>
                    <Table>
                        <Head>
                            <Cell>
                                <Heading>User</Heading>
                            </Cell>
                            <Cell>
                                <Heading>Sipgate ID</Heading>
                            </Cell>
                        </Head>
                        {users.map(user => (
                            <Row>
                                <Cell>
                                    <User accountId={user.accountID} />
                                </Cell>
                                <Cell>
                                    <TextField name={user.accountID} type="text" defaultValue={user.sipgateID || ""} />
                                </Cell>
                            </Row>
                        ))}
                    </Table>
                </Form>
            )}
            <Code text={JSON.stringify(debug, null, 4)} language="json" />
        </Tab>
    )
}