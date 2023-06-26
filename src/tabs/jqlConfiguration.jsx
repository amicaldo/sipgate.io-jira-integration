import { storage } from "@forge/api";
import ForgeUI, { useEffect, useState, Code, Form, Fragment, SectionMessage, Tab, Text, TextField, Toggle } from "@forge/ui";

export default function JQLConfiguration() {
    const [debug, setDebug] = useState({})
    const [jql, setJQL] = useState({})
    const submitForm = async formData => {
        const queriesLength = jql.queries.length
        var queries = jql.queries

        if (queriesLength > formData.jqlQueriesAmount) {
            for (let i = 0; i < queriesLength - formData.jqlQueriesAmount; i++) {
                queries.pop()
            }
        }

        if (queriesLength < formData.jqlQueriesAmount) {
            for (let i = 0; i < formData.jqlQueriesAmount - queriesLength; i++) {
                queries.push({ query: "", variable: "" })
            }
        }

        setJQL({
            enabled: formData.jqlEnable ? true : false,
            queriesAmount: formData.jqlQueriesAmount,
            queries
        })

        await storage.set("jql", {
            enabled: formData.jqlEnable ? true : false,
            queriesAmount: formData.jqlQueriesAmount,
            queries
        })

        setDebug({
            jql: {
                enabled: formData.jqlEnable ? true : false,
                queriesAmount: formData.jqlQueriesAmount,
                queries
            },
            formData
        })
    }
    const submitJQL = async formData => {
        var queries = []

        for (let i = 0; i < jql.queriesAmount; i++) {
            queries.push({ query: formData[`query_${i}`], variable: formData[`variable_${i}`]})
        }

        setJQL({
            ...jql,
            queries
        })

        setDebug({
            queries,
            formData
        })
    }

    useEffect(async () => {
        const jqlRaw = await storage.get("jql")

        setJQL(jqlRaw ? jqlRaw : {
            enabled: false,
            queriesAmount: 0,
            queries: []
        })

        setDebug({
            jqlRaw
        })
    }, [])

    return (
        <Tab label="JQL Configuration">
            <SectionMessage>
                <Text>
                    {"Text"}
                </Text>
            </SectionMessage>
            <Form onSubmit={submitForm}>
                <Toggle label="Enable JQL" name="jqlEnable" defaultChecked={jql.enabled} />
                <TextField isRequired type="number" label="JQL Queries" name="jqlQueriesAmount" defaultValue={jql.queriesAmount} />
            </Form>
            {jql?.queries && jql.queries.length > 0 && (
                <Form onSubmit={submitJQL}>
                    {jql.queries.map(({ query, variable }, index) => (
                        <Fragment>
                            <TextField name={`query_${index}`} label={`JQL Query ${`${index + 1}`.padStart(2, "0")}`} defaultValue={query} />
                            <TextField name={`variable_${index}`} label={`JQL Variable ${`${index + 1}`.padStart(2, "0")}`} defaultValue={variable} />
                        </Fragment>
                    ))}
                </Form>
            )}
            <Code text={JSON.stringify(debug, null, 4)} language="json" />
        </Tab>
    )
}