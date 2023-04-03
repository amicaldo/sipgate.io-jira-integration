import xml from "xml";
import api, { route, webTrigger } from "@forge/api";
import ForgeUI, { render, AdminPage, Form, Fragment, Heading, Text, TextField, useState, Row } from "@forge/ui";

const App = () => {
    const [webTriggerURL, setWebTriggerURL] = useState("")
    const onSubmit = async (formData) => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&handyField=${formData.cField1}&phoneField=${formData.cField2}&issueID=${formData.issueID}`

        setWebTriggerURL(url)
    }

    return (
        <Fragment>
            <Heading>Sipgate Webhook Generator</Heading>
            <Form onSubmit={onSubmit}>
                <TextField name="projectID" isRequired type="text" description="ID of the project" />
                <TextField name="cField1" isRequired type="number" description="ID of the first Custom Field" />
                <TextField name="cField2" isRequired type="number" description="ID of the second Custom Field" />
                <TextField name="issueID" isRequired type="number" description="ID of the issueType" />
            </Form>
            <Text>{webTriggerURL}</Text>
        </Fragment>
    );
};

export async function SipgateCall(req) {
    // try {
        console.log(req.body)
        console.log(req.queryParameters)

        const body = new URLSearchParams(req.body)
        const queryParameters = req.queryParameters
        var answerURL = await webTrigger.getUrl("sipgateAnswer")
        var hangupURL = await webTrigger.getUrl("sipgateHangup")

        console.log(body)

        const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: {
                    summary: `Call from ${body.from}`,
                    issuetype: {
                        id: queryParameters.issueID
                    },
                    project: {
                        key: queryParameters.projectID
                    },
                    [`customfield_${queryParameters.handyField}`]: "0",
                    [`customfield_${queryParameters.phoneField}`]: body.from
                }
            })
        })

        return {
            headers: { "Content-Type": ["application/json"] },
            body: xml({
                Response: [
                    { _attr: { onAnswer: answerURL } },
                    { _attr: { onHangup: hangupURL } }
                ]
            }),
            statusCode: 200,
            statusText: "OK"
        }
    // } catch (error) {
    //     return {
    //         body: error + "\n",
    //         headers: { "Content-Type": ["application/json"] },
    //         statusCode: 400,
    //         statusText: "Bad Request",
    //     }
    // }
}

export async function SipgateAnswer(req) {

}

export async function SipgateHangup(req) {

}

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
