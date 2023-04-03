# Sipgate & Jira Integration

This integration allows you to capture incoming calls on Sipgate and automatically turn them into Jira tickets. The Sipgate & Jira app offers the following features:

- Capturing incoming calls: Whenever a call comes in, the app captures it and creates a ticket in Jira.

- Recording call details: The app logs the time and date of the incoming call, whether it was answered, and who answered it.

- Logging call duration: The app records how long the call lasted and updates the ticket once it is ended.

- Updating tickets: The app updates the ticket in real-time with call information, such as call duration, whether the call was transferred to another employee, and more.
 
To configure the integration, follow these steps:

## Configure Issue Creation

1. Go to "Apps" -> "Manage apps" -> "Sipgate & Jira" and set up the issue configuration for creating tickets with the desired title and description.

    * `issueSummary`: The title of the Jira ticket. This field can include placeholders for call information, such as `{{$numberOrName}}` for the caller's number or name, `{{$spamRatingField}}` for the spam rating, `{{$cityField}}` for the caller's city, `{{$date}}` and `{{$time}}` for the date and time of the call.

    * `issueDescription`: The description of the Jira ticket. This field can also include placeholders for call information.

    * `issueType`: The type of issue to be created. This field determines the workflow that the ticket will follow in Jira.

    * `issuePriority`: The priority of the ticket, ranging from low to high.

    * `issueAssignee`: The Jira user to whom the ticket will be assigned. This can be set to a specific user or left blank to assign the ticket to the project lead.

## Generate the Webhook URL

2. In the Sipgate account settings, generate the webhook URL to ensure that tickets are created in the correct Jira project. The following fields are required for configuring the webhook:

    * `projectID`: The ID of the Jira project in which the ticket will be created.

    * `cField1`: The field in which the incoming call's telephone number will be stored.

    * `issueID`: The ID of the issue type to be created for the incoming call.

## Map Jira Accounts

3. Map all employees and accounts in Jira to their corresponding accounts in Sipgate.

This application is created and maintained by amicaldo GmbH. If you need further assistance, please contact support at support@amicaldo.de.
If you do not want to build the application yourself you can use the free version from the atlassian marketplace.
https://marketplace.atlassian.com/apps/1231419/sipgate-jira-connection
