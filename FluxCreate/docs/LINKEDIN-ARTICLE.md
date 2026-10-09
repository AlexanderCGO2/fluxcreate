# Building FluxCreate: a connected creative suite with AI inside the work

Creative projects rarely stay in one application. A product image becomes a layout. That layout becomes an animation. The animation needs sound, revised copy and several versions for different channels. Each handoff can mean another export, another upload and another explanation of what we are trying to make.

I’m building FluxCreate around that everyday problem: helping creative work move between tools while keeping its context, its source material and as much editability as possible.

The project started with Fluxini, a browser-based procedural creation tool inspired by Houdini. It grew into a broader question: what would a connected creative suite look like if we designed the interfaces, the exchange format and the AI integration together?

We are now preparing to open-source the project. There is working software, an ambitious roadmap and a lot still to build. I want to share both the direction and the questions behind it.

The suite brings together eight workspaces:

- **Fluxfoto** for layered image editing, photos and masks.
- **FluxDesign** for page layout and typography.
- **Fluximiére** for video and audio editing.
- **Fluxiffects** for motion design and compositing.
- **Fluxini** for procedural creation.
- **Flux3D** for working with 3D scenes.
- **FluxLab** for AI content generation and shared AI services.
- **FluxAgents** for designing repeatable AI workflows.

A common interface makes moving between them feel familiar: clear controls, calm surfaces, consistent navigation and attention to the object you are working on. The goal is to make complex work easier to understand without hiding the decisions that matter.

The most interesting part is what happens between applications. A useful handoff needs more than a picture of the previous result. It needs to tell the receiving tool what the object is, where it came from and what can still be changed.

FluxCreate has a shared exchange format and source-preserving object workflows. In supported paths, you can review an object, place it in another editor, retain its original source and deliberately refresh or replace its preview. Text and compatible shapes can travel as editable content. Other objects travel as rendered previews with recoverable originals.

That distinction matters. A preview is not automatically a live native object. Importing a file is not the same as reproducing every feature in the application that created it. We are documenting those boundaries instead of treating a familiar file extension as a promise of perfect compatibility.

AI is part of the same design. When you select something, the helper should understand that selection and the document around it. You should be able to inspect a proposed change, apply it deliberately and undo it. If the document changes while a request is running, an old response should not silently overwrite newer work.

FluxLab provides a common connection to Vercel AI Gateway and exposes capabilities through MCP, the Model Context Protocol. The suite includes personal Gateway settings, so people can bring their own connection. The current integrations cover text, images, video and speech within supported models and workflows; availability depends on the provider and account. More advanced editing, upscaling and music remain areas to develop and verify.

FluxAgents extends that idea from individual requests to repeatable processes. The ambition is a workflow a person can understand: visible steps, conditions, approvals, outputs and recovery when something goes wrong. Local workflow persistence and recovery already exist. Reliable hosted execution, scheduling and durable paid jobs need more infrastructure before they can carry the same promise.

There are also very practical foundations already working: photo masks and layered PSD output, supported PDF and creative-file imports, browser audio playback and scratching, and synchronized audio/video export in Fluximiére. These are bounded implementations. FluxCreate is still an early suite, with substantial gaps in advanced editing, production performance, typography, simulation and collaboration.

The browser is an accessible place to begin. It also makes performance tradeoffs visible. Large media, long timelines and heavy 3D work need careful memory limits, cancellation and testing. A local application or local processing companion may become useful where measured workloads justify it. That decision should follow real projects and evidence.

Preparing an open-source release is a commitment to making the foundations inspectable and adaptable. It also means doing the less visible work: choosing and publishing the license, documenting how to run the suite, reviewing dependencies and making contribution paths understandable. Those release decisions are still being finalized.

We also need a sustainable business around the project. My preferred direction is to keep core creation, portable files and the option to bring your own AI connection accessible, while charging for services that save people time and operational work: managed hosting, shared libraries, collaboration, reliable background execution, support and private deployments.

These are business directions we are evaluating, not paid products I am announcing today. AI costs need to stay visible. A subscription should be understandable, and a creator should be able to take their work with them.

The next phase is about making a few complete workflows dependable while improving the individual editors in parallel. A small studio should be able to move from an asset and a brief to a finished, editable result with fewer broken handoffs. That is a more useful measure of progress than the number of buttons we can add.

I’d love to hear from designers, motion artists, filmmakers, 3D creators and developers: where do your tools lose the most context today? Which handoff makes you repeat work? And what would make an open creative suite useful enough to become part of your real process?

You can follow the project and its documented gaps on [GitHub](https://github.com/AlexanderCGO2/fluxcreate). The hosted preview currently has restricted access while development continues.

#OpenSource #CreativeTools #AI #DesignTools #BuildInPublic

---

Editorial note — not part of the article: Draft prepared 2026-10-09 against the verified release and source roadmap. No full product parity, OSI license already in place, public preview access, paying customers or hosted autonomous execution is claimed. Confirm the license and access status before changing this into an open-source launch announcement. The article has not been published.
