# Bottly: Visual Bot Builder

Build a complete production-quality MVP called "Bottly".

Bottly is a premium no-code Discord Bot Creator. Users can visually create Discord bots without writing code. They can choose a plan, configure their bot, select features, design embeds and Discord components, create slash commands, configure automations, review everything and prepare the bot for deployment.

IMPORTANT:

Do not create a generic SaaS dashboard.

Do not make a static mockup.

Build a functional web application with real navigation, working forms, state management, live previews, dialogs, drag-and-drop where appropriate, persistence and polished UX.

The visual direction should be strongly inspired by Discord and Discohook:

Discohook reference:

https://github.com/discohook/discohook

Use Discohook as inspiration for the visual Discord message/embed editor and Discord-style preview, but DO NOT clone Discohook or copy its branding. Bottly must have its own identity.

==================================================

BRAND

==================================================

Name:

Bottly

Tagline:

"Build Discord bots. Without the code."

Brand personality:

- Premium

- Developer-focused

- Modern

- Clean

- Powerful

- Discord-inspired

- Slightly futuristic

Primary accent:

#5865F2

Secondary accent:

#7C5CFC

Background:

#111214

Surface:

#1A1B1F

Card:

#202225

Elevated:

#2B2D31

Text:

#F2F3F5

Secondary text:

#B5BAC1

Muted:

#80848E

Success:

#23A55A

Danger:

#ED4245

Warning:

#F0B232

Use Inter or a similar modern sans-serif font.

Avoid:

- excessive gradients

- giant cards

- excessive glassmorphism

- generic AI SaaS visuals

- stock illustrations

- excessive rounded corners

The interface should feel like a professional desktop application inside a browser.

==================================================

TECH STACK

==================================================

Use:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- Lucide icons

- Framer Motion

- React Router

- Zustand or another clean state management solution

- Supabase where authentication/database functionality is appropriate

If Supabase is not configured, implement local persistence with localStorage while keeping the architecture ready for Supabase.

Use reusable components.

Do not put the entire application into one file.

==================================================

APPLICATION ROUTES

==================================================

Create:

/

 /login

 /register

 /dashboard

 /bots

 /bots/new

 /bots/:botId

 /bots/:botId/design

 /bots/:botId/commands

 /bots/:botId/components

 /bots/:botId/automations

 /bots/:botId/events

 /bots/:botId/logs

 /bots/:botId/settings

 /pricing

 /docs

==================================================

LANDING PAGE

==================================================

Create a premium landing page for Bottly.

Hero:

"Build Discord bots.

Without the code."

Subtitle:

"Design commands, embeds, components and automations visually — then deploy your bot."

Buttons:

"Create your bot"

"View demo"

Hero visual:

Show an interactive mock Bottly builder with:

- Discord-style preview

- embed editor

- command builder

- components

- automation nodes

Sections:

1. Hero

2. How it works

3. Visual builder

4. Embed builder

5. Commands

6. Automations

7. Pricing

8. FAQ

9. Final CTA

10. Footer

Use subtle animations.

==================================================

AUTHENTICATION

==================================================

Create:

Login

Register

Forgot password

If Supabase is available, use Supabase Auth.

If not, create a realistic local/mock auth system.

After login redirect to /dashboard.

==================================================

DASHBOARD

==================================================

Create a Discord-inspired dashboard.

Header:

"Welcome back."

Subtitle:

"Build and manage your Discord bots."

Statistics:

Total Bots

Online Bots

Commands

Automations

Bot cards:

- avatar

- name

- online/offline status

- commands

- servers

- last updated

- open button

Example bots:

Bottly Helper

Empire Bot

Moderation Pro

Add:

"Create new bot"

button.

==================================================

MY BOTS

==================================================

Create /bots.

Grid/list toggle.

Each bot:

Avatar

Name

Status

Description

Commands

Servers

Last updated

Actions:

Open

Edit

Duplicate

Delete

Use confirmation dialog before deletion.

==================================================

BOT CREATION WIZARD

==================================================

This is the CORE feature.

Route:

/bots/new

Create a multi-step wizard:

1. Plan

2. Bot Info

3. Features

4. Design

5. Commands

6. Components

7. Automations

8. Review

9. Create

Show a progress bar at the top.

The current step should be visually obvious.

Buttons:

Back

Continue

Automatically preserve state.

==================================================

STEP 1 — PLAN

==================================================

Title:

"Choose your plan"

Plans:

FREE

- 1 bot

- 5 commands

- Basic embeds

- Basic components

PRO

- 5 bots

- 50 commands

- Advanced embeds

- Advanced components

- Automations

- Custom branding

ULTIMATE

- Unlimited bots

- Unlimited commands

- Advanced automation

- Advanced analytics

- Priority support

Highlight PRO.

Selecting a plan must update the builder state.

==================================================

STEP 2 — BOT INFO

==================================================

Fields:

Bot Name

Bot Username

Description

Avatar

Language

Timezone

Languages:

JavaScript

Python

Avatar upload:

Show preview.

Validation:

Bot name required.

Description character counter.

==================================================

STEP 3 — FEATURES

==================================================

Feature selection cards:

Moderation

Tickets

Welcome System

Auto Roles

Logging

Giveaways

Verification

Suggestions

Reaction Roles

Economy

Leveling

Music

Custom Commands

Each feature has:

Icon

Name

Description

Toggle

Selected features must persist.

==================================================

STEP 4 — DESIGN

==================================================

This is one of the most important screens.

Create a professional visual Discord message designer inspired by Discohook.

Layout:

LEFT:

Editor controls

CENTER:

Live Discord preview

RIGHT:

Selected element settings

Allow editing:

Bot name

Bot avatar

Theme

Accent color

Default embed color

Message style

Border radius

Theme presets:

Discord Dark

Midnight

Purple

Minimal

Custom

Include color picker.

Every change must immediately update the preview.

==================================================

EMBED BUILDER

==================================================

Create a full Discord Embed Builder.

Fields:

Author

Author name

Author icon

Title

Description

URL

Color

Thumbnail

Image

Fields

Footer

Footer icon

Timestamp

Buttons:

Add Field

Add Embed

Duplicate

Delete

Each embed field:

Name

Value

Inline toggle

Allow drag-and-drop reordering.

The preview must update instantly.

==================================================

DISCORD MESSAGE PREVIEW

==================================================

Create a reusable DiscordMessagePreview component.

It should render:

Avatar

Username

BOT badge

Timestamp

Message content

Embed

Embed color bar

Title

Description

Fields

Thumbnail

Image

Footer

Buttons

Select menus

The preview should look like a realistic Discord message.

It must update live.

Do NOT use screenshots of Discord.

Build the preview with HTML/CSS components.

==================================================

COMPONENT BUILDER

==================================================

Support:

Buttons

Link buttons

String select

User select

Role select

Mentionable select

Channel select

Modals

Text inputs

Containers

Separators

Button editor:

Label

Style

Emoji

Disabled

Action

Styles:

Primary

Secondary

Success

Danger

Link

Show the components inside the Discord preview.

Allow reordering.

==================================================

COMMAND BUILDER

==================================================

Route:

/bots/:botId/commands

Create command management.

Example:

/help

/ticket

/ban

/kick

/warn

/clear

/server

/user

Each command:

Name

Description

Permissions

Response

Enabled

Actions:

Edit

Duplicate

Delete

==================================================

CREATE COMMAND

==================================================

Command fields:

Name

Description

Options:

String

Integer

Number

Boolean

User

Role

Channel

Mentionable

Attachment

Each option:

Name

Description

Required

Autocomplete

Allow reordering.

Response:

Text

Embed

Components

Modal

Additional settings:

Ephemeral

Allowed mentions

Permissions:

Administrator

Manage Server

Manage Messages

Kick Members

Ban Members

Manage Channels

Custom

==================================================

AUTOMATION BUILDER

==================================================

This is a major Bottly feature.

Create a visual workflow editor.

Use React Flow or an equivalent library.

Workflow:

TRIGGER

↓

CONDITION

↓

ACTION

↓

ACTION

Example:

Member joins

↓

Check account age

↓

Send welcome embed

↓

Assign role

Triggers:

Member Join

Member Leave

Message Create

Message Delete

Reaction Add

Reaction Remove

Command Used

Button Click

Select Menu Used

Scheduled Event

Bot Ready

Conditions:

User has role

User does not have role

Channel equals

Message contains

Account age

Permission check

Custom condition

Actions:

Send message

Send embed

Edit message

Delete message

Add role

Remove role

Kick member

Ban member

Timeout member

Create channel

Delete channel

Create ticket

Send DM

Log event

Allow users to connect nodes.

Add:

- zoom

- pan

- minimap

- node selection

- delete node

- duplicate node

==================================================

EVENTS

==================================================

Route:

/bots/:botId/events

Events:

onReady

onMemberJoin

onMemberLeave

onMessageCreate

onInteractionCreate

onGuildCreate

Each event:

Enabled

Description

Actions

==================================================

LOGS

==================================================

Route:

/bots/:botId/logs

Display:

Timestamp

Event

Type

Description

Example:

Bot started

Command executed

Member joined

Ticket created

Automation executed

Error

Filters:

All

Info

Success

Warning

Error

Search.

==================================================

BOT SETTINGS

==================================================

Route:

/bots/:botId/settings

Sections:

General

Bot Token

Appearance

Permissions

Commands

Logging

Security

Danger Zone

Bot token:

Never display token in plaintext after saving.

Show:

••••••••••••••••••

Actions:

Reveal

Regenerate

Remove

For MVP token handling can be mocked.

==================================================

BOT OVERVIEW

==================================================

Route:

/bots/:botId

Header:

Avatar

Bot name

Status

Buttons:

Preview

Invite

Edit

Settings

Statistics:

Commands

Servers

Members

Uptime

Tabs:

Overview

Commands

Design

Components

Automations

Events

Logs

==================================================

INVITE BOT

==================================================

Create an Invite Bot modal.

Fields:

Client ID

Scopes:

bot

applications.commands

Permissions selector.

Generate a Discord OAuth2 invite URL.

Add Copy button.

Do not claim real deployment unless real Discord API is connected.

==================================================

REVIEW

==================================================

Show a complete summary:

Plan

Bot Info

Features

Design

Commands

Components

Automations

Each section has:

Edit

button.

Show:

"Everything looks good."

Button:

"Create Bot"

==================================================

CREATE BOT ANIMATION

==================================================

When the user clicks Create Bot:

Show animated progress:

Creating bot configuration...

Generating commands...

Applying design...

Preparing components...

Preparing automations...

Finalizing...

Then show:

"Your bot is ready."

Bot avatar.

Status:

Ready

Buttons:

Open Dashboard

Invite Bot

View Bot

==================================================

PERSISTENCE

==================================================

Autosave builder state.

Show:

Saving...

then:

Saved

Use debounce.

For MVP use localStorage if Supabase isn't configured.

Do not lose wizard state on navigation.

==================================================

STATE MODEL

==================================================

Create proper TypeScript types.

Bot:

id

name

username

description

avatar

status

plan

language

timezone

features

design

commands

components

automations

events

createdAt

updatedAt

Design:

theme

accentColor

embedColor

font

borderRadius

botName

botAvatar

Embed:

author

title

description

url

color

thumbnail

image

fields

footer

timestamp

Command:

id

name

description

options

permissions

response

enabled

Component:

id

type

label

style

emoji

action

disabled

Automation:

id

name

trigger

conditions

actions

enabled

==================================================

LAYOUT

==================================================

Inside the bot builder use:

Left sidebar:

Navigation

Top bar:

Breadcrumb

Bot name

Save status

Preview

Deploy

Main:

Current editor

Optional right:

Live Discord preview

The editor should feel like a desktop creative tool.

==================================================

SIDEBAR

==================================================

Logo:

Bottly

Navigation:

Dashboard

My Bots

Current bot:

Overview

Commands

Design

Components

Automations

Events

Logs

Settings

Bottom:

Docs

Pricing

User profile

==================================================

COMMAND PALETTE

==================================================

Add:

Ctrl/Cmd + K

Command palette.

Actions:

Create Bot

Create Command

Open Embed Builder

Open Automations

Search

Settings

==================================================

SEARCH

==================================================

Global search:

Bots

Commands

Automations

Logs

==================================================

ANIMATIONS

==================================================

Use Framer Motion.

Animations:

Page transitions

Wizard transitions

Modal open/close

Sidebar hover

Card hover

Drag/drop

Preview updates

Toast

Bot creation

Keep animations subtle and fast.

==================================================

RESPONSIVE

==================================================

Desktop-first.

Support:

1440x900

1920x1080

1280x720

Mobile:

Sidebar becomes drawer.

Editor panels stack.

Preview moves below editor.

Wizard steps become horizontally scrollable.

==================================================

ACCESSIBILITY

==================================================

Use:

Keyboard navigation

ARIA labels

Focus states

Proper form labels

Good contrast

Tooltips

Do not communicate state using color alone.

==================================================

EMPTY STATES

==================================================

Create polished empty states.

Example:

"No commands yet."

"Create your first slash command."

Button:

"Create command"

Every major page should have a proper empty state.

==================================================

LOADING STATES

==================================================

Use skeleton loaders.

Avoid unnecessary full-screen spinners.

==================================================

ERROR STATES

==================================================

Create useful errors:

"Something went wrong."

"Your changes couldn't be saved."

Retry button.

==================================================

MOCK DATA

==================================================

Populate the dashboard.

Example:

Bottly Helper

Online

24 commands

8 servers

Empire Bot

Online

18 commands

12 servers

Moderation Pro

Offline

31 commands

5 servers

==================================================

PRICING

==================================================

Create /pricing.

Plans:

Free

Pro

Ultimate

Feature comparison.

Highlight Pro.

==================================================

DOCUMENTATION

==================================================

Create /docs.

Sidebar:

Getting Started

Creating a Bot

Commands

Embeds

Components

Automations

Deployment

FAQ

Use realistic content.

==================================================

IMPORTANT FUNCTIONAL REQUIREMENTS

==================================================

This must be a FUNCTIONAL MVP, not a static design.

If I change an embed title:

the preview changes.

If I change embed color:

the preview changes.

If I add a field:

the preview changes.

If I add a button:

the preview changes.

If I create a command:

it appears in the command list.

If I delete a command:

it disappears.

If I change the bot name:

it updates throughout the UI.

If I change a theme:

the preview updates.

If I add an automation:

it appears in the workflow.

If I navigate between wizard steps:

state persists.

If I refresh:

saved data is restored.

==================================================

BACKEND

==================================================

Do not attempt to build a real Discord hosting infrastructure for the MVP.

Separate mock services from UI.

Create a service abstraction that can later connect to:

Discord OAuth

Discord REST API

Discord Gateway

Bot hosting

Supabase

For now use mock/local implementations where necessary.

==================================================

FOLDER STRUCTURE

==================================================

Use a clean architecture such as:

src/

  components/

    layout/

    builder/

    embed/

    commands/

    components/

    automation/

    bot/

    ui/

  pages/

  hooks/

  stores/

  services/

  types/

  utils/

  data/

Do not put everything into App.tsx.

==================================================

QUALITY

==================================================

Before finishing:

- Run the build

- Fix TypeScript errors

- Fix import errors

- Fix routing errors

- Check every button

- Check forms

- Check modals

- Check preview

- Check persistence

- Check responsive layouts

- Check console errors

Do not leave obvious TODOs.

Do not create fake buttons that do nothing.

Do not use placeholder lorem ipsum.

Use realistic copy throughout the application.

==================================================

FINAL PRODUCT EXPERIENCE

==================================================

The user journey should be:

Open Bottly

↓

Create account

↓

Dashboard

↓

Create Bot

↓

Choose Plan

↓

Bot Information

↓

Select Features

↓

Design

↓

Build Embeds

↓

Create Commands

↓

Add Components

↓

Create Automations

↓

Review

↓

Create Bot

↓

Bot Dashboard

↓

Invite / Deploy

The final result should feel like a real startup product that could be shown publicly.

Prioritize polish, usability, visual consistency and functional interactions.

START BUILDING THE APPLICATION NOW.

Do not only explain the implementation.

Actually create the application and implement the functionality.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bottly-bot-builder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/955a550f-3d92-47c5-b89c-7e9bf61d6b98).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
