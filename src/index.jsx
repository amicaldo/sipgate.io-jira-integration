import { webTrigger } from "@forge/api";
import ForgeUI, { render, AdminPage, Form, Fragment, Heading, Text, TextField, useState } from '@forge/ui';

const App = () => {
    const [webTriggerURL, setWebTriggerURL] = useState("")
    const onSubmit = async (formData) => {
        var url = await webTrigger.getUrl("sipgateCall")

        url += `?project=${formData.projectID}&phoneField=${formData.cField1}&handyField=${formData.cField2}`

        setWebTriggerURL(url)
    }

    return (
        <Fragment>
            <Heading>Sipgate Webhook Generator</Heading>
            <Form onSubmit={onSubmit}>
                <TextField name="projectID" isRequired type="text" description="ID of the project" />
                <TextField name="cField1" isRequired type="number" description="ID of the first Custom Field" />
                <TextField name="cField2" isRequired type="number" description="ID of the second Custom Field" />
            </Form>
            <Text>{webTriggerURL}</Text>
        </Fragment>
    );
};

export const SipgateCall = () => {

}

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
