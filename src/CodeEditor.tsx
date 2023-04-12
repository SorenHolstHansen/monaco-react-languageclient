import "monaco-editor/esm/vs/editor/edcore.main.js";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { buildWorkerDefinition } from "monaco-editor-workers";
import { MonacoLanguageClient, MonacoServices } from "monaco-languageclient";
import React, { useCallback, useMemo, useRef } from "react";
import { CloseAction, ErrorAction } from "vscode-languageclient";
import type EditorType from "monaco-editor/esm/vs/editor/editor.api";
import { StandaloneServices } from "vscode/services";
import "monaco-editor/esm/vs/editor/edcore.main.js";
import {
  BrowserMessageReader,
  BrowserMessageWriter,
} from "vscode-languageserver-protocol/browser.js";
import getModelEditorServiceOverride from "vscode/service-override/modelEditor";
import getNotificationServiceOverride from "vscode/service-override/notifications";
import getDialogsServiceOverride from "vscode/service-override/dialogs";
import getConfigurationServiceOverride from "vscode/service-override/configuration";
import getKeybindingsServiceOverride from "vscode/service-override/keybindings";
import { registerExtension } from "vscode/extensions";
import getTextmateServiceOverride from "vscode/service-override/textmate";
import getLanguagesServiceOverride from "vscode/service-override/languages";
import getTokenClassificationServiceOverride from "vscode/service-override/tokenClassification";
import getLanguageConfigurationServiceOverride from "vscode/service-override/languageConfiguration";
import getThemeServiceOverride from "vscode/service-override/theme";
import getAudioCueServiceOverride from "vscode/service-override/audioCue";
import { BeforeMount, Editor } from "@monaco-editor/react";

const languageId = "statemachine";
buildWorkerDefinition(
  "../node_modules/monaco-editor-workers/dist/workers/",
  new URL("", window.location.href).href,
  false
);

StandaloneServices.initialize({
  ...getModelEditorServiceOverride(async (model, options) => {
    console.log("Trying to open a model", model, options);
    return undefined;
  }),
  ...getNotificationServiceOverride(),
  ...getDialogsServiceOverride(),
  ...getConfigurationServiceOverride(),
  ...getKeybindingsServiceOverride(),
  ...getTextmateServiceOverride(),
  ...getThemeServiceOverride(),
  ...getTokenClassificationServiceOverride(),
  ...getLanguageConfigurationServiceOverride(),
  ...getLanguagesServiceOverride(),
  ...getAudioCueServiceOverride(),
});

const extension = {
  name: "langium-example",
  publisher: "monaco-languageclient-project",
  version: "1.0.0",
  engines: {
    vscode: "*",
  },
  contributes: {
    languages: [
      {
        id: languageId,
        extensions: [`.${languageId}`],
        aliases: [languageId],
        configuration: "./statemachine-configuration.json",
      },
    ],
    grammars: [
      {
        language: languageId,
        scopeName: "source.statemachine",
        path: "./statemachine-grammar.json",
      },
    ],
    keybindings: [
      {
        key: "ctrl+p",
        command: "editor.action.quickCommand",
        when: "editorTextFocus",
      },
      {
        key: "ctrl+shift+c",
        command: "editor.action.commentLine",
        when: "editorTextFocus",
      },
    ],
  },
};
const { registerFile: registerExtensionFile } = registerExtension(extension);

registerExtensionFile("/statemachine-configuration.json", async () => {
  const statemachineLanguageConfig = new URL(
    "../node_modules/langium-statemachine-dsl/language-configuration.json",
    window.location.href
  ).href;
  return (await fetch(statemachineLanguageConfig)).text();
});

registerExtensionFile("/statemachine-grammar.json", async () => {
  const statemachineTmUrl = new URL(
    "../node_modules/langium-statemachine-dsl/syntaxes/statemachine.tmLanguage.json",
    window.location.href
  ).href;
  return (await fetch(statemachineTmUrl)).text();
});

const langiumWorkerUrl = new URL(
  "./dist/worker/statemachineServerWorker.js",
  window.location.href
).href;

export const ReactMonacoEditor: React.FC = () => {
  const monacoRef = useRef<typeof EditorType>();
  const worker: Worker = useMemo(
    () =>
      new Worker(langiumWorkerUrl, {
        type: "module",
        name: "Statemachine LS",
      }),
    []
  );

  const beforeMount = useCallback<BeforeMount>((monaco) => {
    // monaco.languages.register({
    //   id: languageId,
    //   extensions: [`.${languageId}`],
    //   aliases: [languageId],
    // });

    MonacoServices.install();

    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);

    const languageClient = new MonacoLanguageClient({
      name: "Langium Statemachine Client",
      clientOptions: {
        // use a language id as a document selector
        documentSelector: [{ language: languageId }],
        // disable the default error handler
        errorHandler: {
          error: () => ({ action: ErrorAction.Continue }),
          closed: () => ({ action: CloseAction.DoNotRestart }),
        },
      },
      // create a language client connection to the server running in the web worker
      connectionProvider: {
        get: () => {
          return Promise.resolve({ reader, writer });
        },
      },
    });

    languageClient.start();

    reader.onClose(() => languageClient.stop());

    monacoRef.current = monaco;
  }, []);

  return (
    <Editor
      beforeMount={beforeMount}
      defaultPath="inmemory://example.statemachine"
      height="90vh"
      value={`statemachine TrafficLight

events
    switchCapacity
    next

initialState PowerOff

state PowerOff
    switchCapacity => RedLight
end

state RedLight
    switchCapacity => PowerOff
    next => GreenLight
end

state YellowLight
    switchCapacity => PowerOff
    next => RedLight
end

state GreenLight
    switchCapacity => PowerOff
    next => YellowLight
end`}
      language={languageId}
    />
  );
};
