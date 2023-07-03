import { storage } from "@forge/api";
import ForgeUI, { useEffect, useState, Form, FormCondition, Fragment, Option, SectionMessage, Select, Tab, Text, TextField, Toggle } from "@forge/ui";

const options = [
    "Custom Text",
    "{{$number}}",
    "{{$date}}",
    "{{$time}}",
    "{{$rating}}",
    "{{$city}}",
    "{{$sipgateNumber}}",
    "{{$spamRatingField}}",
    "{{$cityField}}",
    "{{$timeField}}"
]

export default function JQLConfiguration() {
    const [jql, setJQL] = useState({})
    const submitForm = async formData => {
        var queries = [...jql.queries]
        const queriesLength = queries.length

        if (queriesLength > formData.jqlQueriesAmount) {
            for (let i = 0; i < queriesLength - formData.jqlQueriesAmount; i++) {
                queries.pop()
            }
        }

        if (queriesLength < formData.jqlQueriesAmount) {
            for (let i = 0; i < formData.jqlQueriesAmount - queriesLength; i++) {
                queries.push({ query: "", variable: "", defaultValue: "{{$time}}" })
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
    }
    const submitJQL = async formData => {
        const jqlCopy = { ...jql }
        var queries = []

        for (let i = 0; i < jql.queriesAmount; i++) {
            queries.push({
                query: formData[`query_${i}`],
                variable: formData[`variable_${i}`],
                defaultValue: formData[`select_${i}`] === "Custom Text" ? formData[`custom_${i}`] : formData[`select_${i}`]
            })
        }

        setJQL({
            ...jqlCopy,
            queries
        })

        await storage.set("jql", {
            ...jqlCopy,
            queries
        })
    }

    useEffect(async () => {
        const jqlRaw = await storage.get("jql")

        setJQL(jqlRaw ? jqlRaw : {
            enabled: false,
            queriesAmount: 0,
            queries: []
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
                <Toggle
                    label="Enable JQL"
                    name="jqlEnable"
                    defaultChecked={jql.enabled}
                />
                <TextField
                    isRequired
                    type="number"
                    label="JQL Queries"
                    name="jqlQueriesAmount"
                    defaultValue={jql.queriesAmount}
                />
            </Form>
            {jql?.queries && jql.queries.length > 0 && (
                <Form onSubmit={submitJQL}>
                    {jql.queries.map(({ query, variable, defaultValue }, index) => (
                        <Fragment>
                            <TextField
                                name={`query_${index}`}
                                label={`JQL Query ${`${index + 1}`.padStart(2, "0")}`}
                                defaultValue={query} />
                            <TextField
                                name={`variable_${index}`}
                                label={`JQL Variable ${`${index + 1}`.padStart(2, "0")}`}
                                defaultValue={variable}
                            />
                            <Select
                                name={`select_${index}`}
                                label={`Default Value ${`${index + 1}`.padStart(2, "0")}`}
                            >
                                {options.map((option, index) => (
                                    <Option
                                        label={option}
                                        defaultSelected={
                                            index === 0 && !options.includes(defaultValue) ?
                                                true : option === defaultValue
                                        }
                                        value={option} />
                                ))}
                            </Select>
                            <FormCondition when={`select_${index}`} is={"Custom Text"}>
                                <TextField
                                    label={`Custom Text ${`${index + 1}`.padStart(2, "0")}`}
                                    name={`custom_${index}`}
                                    defaultValue={options.includes(defaultValue) ? "" : defaultValue}
                                />
                            </FormCondition>
                        </Fragment>
                    ))}
                </Form>
            )}
        </Tab>
    )
}