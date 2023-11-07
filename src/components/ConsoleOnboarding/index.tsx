import dedent from 'ts-dedent'
import HighlightedCodeBlock, {
  HighlightedCodeBlockProps,
} from '~/components/HighlightedCodeBlock'
import { trpc } from '~/utils/trpc'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import Transition from '../Transition'
import { useState } from 'react'
import classNames from 'classnames'
import { useMe } from '~/components/MeContext'
import IVInputField from '~/components/IVInputField'
import IVSelect from '~/components/IVSelect'
import { examples } from '~/utils/examples'
import IconCode from '~/icons/compiled/Code'

function InstructionsContainer(props: {
  show?: boolean
  children: React.ReactNode
}) {
  return (
    <Transition
      show={props.show}
      enter="transition-all ease-linear duration-150 delay-200 absolute top-0 left-0 right-0"
      enterFrom="opacity-0 translate-x-6"
      enterTo="opacity-100 translate-x-0"
      leave="transition-all ease-linear duration-150 absolute top-0 left-0 right-0"
      leaveFrom="opacity-100 translate-x-0"
      leaveTo="opacity-0 translate-x-6"
    >
      <div className="text-sm leading-6 max-w-[650px]">{props.children}</div>
    </Transition>
  )
}

function CompletionMessage() {
  return (
    <p>
      That's it! Once you start your app, this message will disappear and you'll
      be able to run the actions you're developing. Installation instructions
      and code samples will remain available{' '}
      <a
        href="https://interval.com/docs/installation"
        className="text-primary-500 font-medium hover:opacity-60"
        target="_blank"
      >
        in the docs
      </a>
      .
    </p>
  )
}

function CodeSnippet(props: { children: React.ReactNode }) {
  return <div className="py-2 prose">{props.children}</div>
}

const codeBlockProps: Partial<HighlightedCodeBlockProps> = {
  theme: 'light',
  className: 'bg-[#F6F8FA]',
  canDownload: false,
}

function InstallToExisting({ language }: { language: string }) {
  const key = trpc.useQuery(['key.dev'])
  const navigate = useNavigate()

  let mainCode = ''
  let mainFileName: string | undefined = undefined
  let actionCode: string | undefined = undefined
  let actionFileName: string | undefined = undefined
  switch (language) {
    case 'typescript':
      mainFileName = 'src/interval.ts'
      actionFileName = 'src/routes/hello_world.ts'
      mainCode = dedent(`
        import path from "path";
        import { Interval } from "@interval/sdk";

        const interval = new Interval({
          apiKey: "${key?.data?.key || ''}",
          routesDirectory: path.resolve(__dirname, "routes"),
        });

        interval.listen();
      `)
      actionCode = dedent(`
        import { Action, io } from "@interval/sdk";

        export default new Action(async () => {
          const name = await io.input.text("Your name");
          return \`Hello, $\{name}\`;
        });
      `)
      break
    case 'javascript':
      mainFileName = 'src/interval.js'
      actionFileName = 'src/routes/hello_world.js'
      mainCode = dedent(`
        const path = require("path");
        const { Interval } = require("@interval/sdk");

        const interval = new Interval({
          apiKey: "${key?.data?.key || ''}",
          routesDirectory: path.resolve(__dirname, "routes"),
        });

        interval.listen();
      `)
      actionCode = dedent(`
        const { Action, io } = require("@interval/sdk");

        module.exports = new Action(async () => {
          const name = await io.input.text("Your name");
          return \`Hello, $\{name}\`;
        });
      `)
      break
    case 'python':
      mainCode = dedent(`
        import os
        from interval_sdk import Interval, IO

        interval = Interval(
            "${key?.data?.key || ''}",
        )

        @interval.action
        async def hello_world(io: IO):
            name = await io.input.text("Your name")
            return f"Hello {name}"

        interval.listen()
      `)
      break
  }

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-2">
            1. Install the SDK
          </h3>
          <p className="mb-4">
            You can also{' '}
            <a
              onClick={() =>
                navigate(location.pathname, { state: 'installNew' })
              }
              className="text-primary-500 font-medium hover:opacity-60 cursor-pointer"
            >
              create a new Interval project from a template
            </a>
            .
          </p>
          <CodeSnippet>
            <HighlightedCodeBlock
              {...codeBlockProps}
              code={
                language === 'python'
                  ? `pip install interval-sdk`
                  : `npm install @interval/sdk`
              }
              language="bash"
              canDownload={false}
            />
          </CodeSnippet>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-2">
            2. Create your first action
          </h3>
          <div className="space-y-2 mb-4 mt-4">
            <p>
              <strong>Actions are created from within your codebase</strong> and
              will appear here when your SDK listener comes online. To create
              your first action, copy the following example code into your
              project:
            </p>
            <CodeSnippet>
              <HighlightedCodeBlock
                {...codeBlockProps}
                fileName={mainFileName}
                code={mainCode}
                language="typescript"
              />
            </CodeSnippet>
            {actionCode && (
              <CodeSnippet>
                <HighlightedCodeBlock
                  {...codeBlockProps}
                  fileName={actionFileName}
                  code={actionCode}
                  language="typescript"
                />
              </CodeSnippet>
            )}
          </div>
        </div>
        <div>
          <CompletionMessage />
        </div>
      </div>
    </div>
  )
}

function LanguageTab({ label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'py-1.5 px-2 border-b-[3px] font-semibold text-sm',
        {
          'border-primary-500 text-primary-500': isActive,
          'border-transparent text-gray-600': !isActive,
        }
      )}
    >
      {label}
    </button>
  )
}

function InstallToNew({
  onboardingExampleSlug,
  language,
}: {
  language: 'typescript' | 'javascript' | 'python'
  onboardingExampleSlug: string | null
}) {
  const navigate = useNavigate()
  const key = trpc.useQuery(['key.dev'])

  const [selectedTemplate, setSelectedTemplate] = useState(
    onboardingExampleSlug || 'basic'
  )

  const keyArg = key?.data ? `--personal_development_key=${key.data.key}` : ''
  const languageArg = `--language=${language}`
  const templateArg = `--template=${selectedTemplate}`

  const command = ['npx create-interval-app', templateArg, languageArg, keyArg]
    .join(' ')
    .replace(/\s+/g, ' ')

  const templateOptions = [
    { label: 'Start from scratch', value: 'basic' },
    ...examples.map(e => ({ label: e.label, value: e.id })),
  ]

  return (
    <div>
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-2">
            1. Create a new Interval project
          </h3>

          <p className="mb-4">
            Generate the scaffolding for a blank slate Interval app, or select a
            template to start with{' '}
            <a
              href="/examples"
              className="text-primary-500 font-medium hover:opacity-60"
              target="_blank"
            >
              one of our pre-built example tools
            </a>
            .
          </p>
          {language === 'python' ? (
            <p className="mb-4">
              This command uses JavaScript command line tools to create the
              project from a template. If you don't have Node installed, you can{' '}
              <a
                onClick={() =>
                  navigate(location.pathname, { state: 'installExisting' })
                }
                className="text-primary-500 font-medium hover:opacity-60 cursor-pointer"
              >
                add Interval to an existing codebase
              </a>{' '}
              or{' '}
              <a
                href="https://github.com/interval/interval-examples"
                target="_blank"
                className="text-primary-500 font-medium hover:opacity-60 cursor-pointer"
                rel="noreferrer"
              >
                clone the templates directly
              </a>
              .
            </p>
          ) : (
            <p className="mb-4">
              You can also{' '}
              <a
                onClick={() =>
                  navigate(location.pathname, { state: 'installExisting' })
                }
                className="text-primary-500 font-medium hover:opacity-60 cursor-pointer"
              >
                add Interval to an existing codebase instead
              </a>
              .
            </p>
          )}
          <IVInputField id="template" label="Template">
            <IVSelect
              className="mb-4"
              onChange={e => {
                setSelectedTemplate(e.target.value)
              }}
              options={templateOptions}
              defaultValue={selectedTemplate}
            />
          </IVInputField>

          <CodeSnippet>
            <HighlightedCodeBlock
              {...codeBlockProps}
              code={command}
              language="bash"
            />
          </CodeSnippet>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-2">
            2. Start your app
          </h3>
          <CodeSnippet>
            <HighlightedCodeBlock
              {...codeBlockProps}
              code={
                language === 'python'
                  ? `source .venv/bin/activate && python main.py`
                  : `npm run dev`
              }
              language="bash"
            />
          </CodeSnippet>
        </div>
        <div>
          <CompletionMessage />
        </div>
      </div>
    </div>
  )
}

const onboardingScreens = ['installNew', 'installExisting']

export default function ConsoleOnboarding() {
  const location = useLocation()
  const { orgSlug } = useParams()
  const { me } = useMe()

  const onboardingExampleSlug = me?.userOrganizationAccess.find(
    uoa => uoa.organization.slug === orgSlug
  )?.onboardingExampleSlug

  let currentScreen = location.state ? location.state : 'installNew'

  if (!onboardingScreens.includes(String(currentScreen))) {
    currentScreen = 'installNew'
  }

  const [language, setLanguage] = useState<
    'javascript' | 'typescript' | 'python'
  >('typescript')

  return (
    <div className="text-sm leading-6 max-w-[650px] relative pb-6">
      <h2 className="h2 mb-4">
        <IconCode className="inline mb-1 mr-2 w-8 h-8" aria-hidden="true" />
        Connect from the SDK
      </h2>
      <p className="mb-4">
        Tools in Interval are called{' '}
        <a
          href="https://interval.com/docs/concepts/actions"
          target="_blank"
          className="text-primary-500 font-medium hover:opacity-60"
        >
          actions
        </a>{' '}
        and created using the Interval SDK. Follow the steps below to install
        the SDK in your existing project and start building actions.
      </p>
      <div className="flex items-start mb-4">
        <LanguageTab
          label="TypeScript"
          isActive={language === 'typescript'}
          onClick={() => setLanguage('typescript')}
        />
        <LanguageTab
          label="JavaScript"
          isActive={language === 'javascript'}
          onClick={() => setLanguage('javascript')}
        />
        <LanguageTab
          label="Python"
          isActive={language === 'python'}
          onClick={() => setLanguage('python')}
        />
      </div>
      {currentScreen === 'installNew' && (
        <InstallToNew
          onboardingExampleSlug={onboardingExampleSlug || null}
          language={language}
        />
      )}
      {currentScreen === 'installExisting' && (
        <InstallToExisting language={language} />
      )}
    </div>
  )
}
