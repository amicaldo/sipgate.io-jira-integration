import ForgeUI, { render, AdminPage, Form, Fragment, Heading, Text, TextField, useState } from '@forge/ui';

const App = () => {
    const [formState, setFormState] = useState(undefined)
    const onSubmit = (formData) => {
        setFormState(formData)
    }

    return (
        <Fragment>
            <Heading>Sipgate Webhook Generator</Heading>
            <Form onSubmit={onSubmit}>
                <TextField name="projectID" isRequired type="text" description="ID of the project" />
                <TextField name="cfield1" isRequired type="number" description="ID of the first Custom Field" />
                <TextField name="cfield2" isRequired type="number" description="ID of the second Custom Field" />
                <TextField name="cfield3" isRequired type="number" description="ID of the third Custom Field" />
            </Form>
            {formState && <Text>{JSON.stringify(formState, null, 4)}</Text>}
        </Fragment>
    );
};

export const run = render(
    <AdminPage>
        <App />
    </AdminPage>
);
