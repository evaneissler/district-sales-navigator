import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "I Expected Vercel's AI Tools to Be Complicated. I Was Wrong.",
  description:
    "Building an agentic lead-research system on Vercel Sandboxes, Workflows, and the AI SDK — and why it was far simpler than the equivalent AWS build.",
};

export default function BlogPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-8"
      >
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      {/* Header */}
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-900 mb-3">
          Engineering
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          I Expected Vercel&apos;s AI Tools to Be Complicated. I Was Wrong.
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-4">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" /> June 10, 2026
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> 6 min read
          </span>
        </div>
      </header>

      <div className="space-y-5 text-[15px] leading-7 text-slate-700">
        <Lead>
          Recently, I was asked to build a project using a combination of Vercel
          Sandboxes, Workflows, and AI agent orchestration. My first reaction was
          honestly a little hesitation.
        </Lead>

        <P>
          I&apos;ve built agentic systems before, and while they&apos;re powerful,
          they&apos;re usually pretty complicated to set up. Between infrastructure,
          credentials, local development, queues, containers, deployment pipelines,
          and orchestration, there is usually a lot to figure out before you ever get
          to building the actual product.
        </P>
        <P>
          When I was told to build something using these tools, I assumed it would be
          more of the same. I was completely wrong.
        </P>

        <H2>Sandboxes</H2>
        <P>
          My first impression of Vercel Sandbox was that it was basically a Docker
          container where you package up code and run it somewhere else. While that is
          technically true at a high level, it is so much more than that.
        </P>
        <P>
          What surprised me was how easy it was to get started. The docs were
          straightforward, and within a few minutes I had a sandbox running locally.
          The really impressive part came when I deployed the application: the exact
          same code I was running locally worked in production. Vercel handled the
          infrastructure and execution environment for me.
        </P>
        <P>I didn&apos;t need to:</P>
        <List
          items={[
            "Build and maintain container infrastructure",
            "Manage scaling",
            "Worry about concurrent executions",
            "Create custom deployment pipelines",
            "Think about how the execution environment would behave in production",
          ]}
        />
        <P>
          I could focus entirely on the functionality I wanted to build. That was a
          huge surprise.
        </P>

        <H2>Workflows</H2>
        <P>
          My previous understanding of workflows was basically tools like Zapier or
          n8n — a visual drag-and-drop interface where you connect boxes together. So
          when I saw there was a Workflow SDK, I was honestly a little intimidated. How
          does a workflow translate into code?
        </P>
        <P>
          As it turns out, very naturally. You install the package, define your
          workflow, and then write out the steps you want to happen. It almost feels
          like writing out instructions in plain English. Instead of worrying about the
          infrastructure behind scheduling, execution, retries, and orchestration, you
          focus on the business logic and Vercel handles the rest. What I expected to be
          one of the more complicated parts of the project ended up being one of the
          simplest.
        </P>

        <H2>Comparing It to a Similar AWS Project</H2>
        <P>
          What made this experience especially interesting is that I had previously
          built a very similar project on AWS. The goal was almost identical: a
          scheduled process discovers a new lead, runs an agent to find and process
          information from the company&apos;s website, and then stores the enriched
          data.
        </P>
        <P>The AWS version looked something like this:</P>
        <List
          ordered
          items={[
            "CloudWatch Event triggers on a schedule",
            "Dispatcher Lambda finds a new lead",
            "Lead gets added to a queue",
            "Worker Lambda processes the lead",
            "Agent discovers and analyzes websites",
            "Results are stored",
          ]}
        />
        <P>It worked, but there were a lot of challenges.</P>

        <H3>Lambda Timeouts</H3>
        <P>
          Agents are inherently unpredictable. Sometimes they finish quickly, sometimes
          they take longer. I constantly had to think about timeout settings and make
          sure they were set high enough that executions wouldn&apos;t fail. With
          Vercel Workflows, that concern mostly disappears — the workflow is not one
          giant execution that has to finish within a specific amount of time. Instead,
          it is broken into managed steps. That alone removes a lot of complexity.
        </P>

        <H3>Complexity Adds Up Fast</H3>
        <P>
          As the AWS project became more capable, the architecture became harder and
          harder to work with. More Lambdas. More queues. More event triggers. More
          dependencies between services. At a certain point, making changes became
          stressful because there were so many moving pieces. I honestly haven&apos;t
          touched parts of that codebase in weeks because every change feels like it
          could accidentally break something upstream or downstream.
        </P>
        <P>
          With Vercel, the workflow and agent abstractions make each step much easier to
          understand and reason about. The architecture feels significantly simpler.
        </P>

        <H3>Development Speed</H3>
        <P>
          This was probably the biggest surprise. In a few hours, I was able to recreate
          the core functionality of a system that took significantly more effort to
          build in AWS. More importantly, making changes feels easy. I can update a
          workflow step, tweak an agent, add a tool, or adjust the logic without feeling
          like I might accidentally bring down the whole system. That confidence matters
          a lot when you&apos;re iterating quickly.
        </P>

        <H2>Local Development and Deployment</H2>
        <P>
          One thing that always frustrated me with Lambda-heavy systems was local
          development. Testing locally was never quite the same as testing in
          production — there were always environment differences, deployment concerns,
          queues to simulate, or infrastructure dependencies to manage.
        </P>
        <P>
          With Vercel, the experience feels much more straightforward. I can develop
          locally, deploy, and have confidence that things will behave the same way. I
          don&apos;t have to think about Terraform, container orchestration,
          infrastructure management, or maintaining separate environments. That
          simplicity makes a huge difference.
        </P>

        <H2>Final Thoughts</H2>
        <P>
          I&apos;ve been extremely pleasantly surprised by how easy these tools are to
          use and how powerful they are. Going into this project, I expected to spend
          most of my time dealing with infrastructure and orchestration problems.
          Instead, I spent my time building the actual product.
        </P>
        <P>
          The setup was straightforward. The documentation was easy to follow. Local
          development worked exactly how I hoped it would. Deployment was simple. And
          the abstractions are good enough that I can focus on building features instead
          of maintaining infrastructure.
        </P>
        <P>
          I honestly did not expect to be this impressed. This project has made me
          seriously consider moving some of my existing AWS-based agent systems over to
          Vercel in the future. And most importantly, I&apos;m excited to build the next
          project.
        </P>
      </div>

      <footer className="mt-12 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-900 hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to the dashboard
        </Link>
      </footer>
    </article>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-lg leading-8 text-slate-600">{children}</p>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 pt-6">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold tracking-tight text-slate-900 pt-4">
      {children}
    </h3>
  );
}

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const cls = "ml-5 space-y-1.5 marker:text-slate-400";
  return ordered ? (
    <ol className={`list-decimal ${cls}`}>
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ol>
  ) : (
    <ul className={`list-disc ${cls}`}>
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}
