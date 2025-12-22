import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { groqLLM } from '../llm/groq.js';
import {
    BaseAgentState,
    AgentType,
    ReasoningStep,
    ToolExecution
} from './types.js';

export interface AgentConfig {
    name: string;
    type: AgentType;
    description: string;
    systemPrompt: string;
    tools: StructuredTool[];
}

export abstract class BaseAgent {
    protected config: AgentConfig;
    protected llm = groqLLM;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    get name(): string {
        return this.config.name;
    }

    get type(): AgentType {
        return this.config.type;
    }

    get description(): string {
        return this.config.description;
    }

    get tools(): StructuredTool[] {
        return this.config.tools;
    }

    // Create the system message for this agent
    protected getSystemMessage(): SystemMessage {
        return new SystemMessage(this.config.systemPrompt);
    }

    // Add a reasoning step to state
    protected addReasoningStep(
        state: BaseAgentState,
        title: string,
        description: string
    ): void {
        const step: ReasoningStep = {
            step: state.reasoningSteps.length + 1,
            title,
            description,
            status: 'pending',
        };
        state.reasoningSteps.push(step);
    }

    // Update reasoning step status
    protected updateReasoningStep(
        state: BaseAgentState,
        stepIndex: number,
        status: ReasoningStep['status']
    ): void {
        if (state.reasoningSteps[stepIndex]) {
            state.reasoningSteps[stepIndex].status = status;
        }
    }

    // Add a tool execution to state
    protected addToolExecution(
        state: BaseAgentState,
        toolName: string,
        toolInput: Record<string, unknown>
    ): number {
        const execution: ToolExecution = {
            toolName,
            toolInput,
            status: 'pending',
            startedAt: new Date(),
        };
        state.toolExecutions.push(execution);
        return state.toolExecutions.length - 1;
    }

    // Complete a tool execution
    protected completeToolExecution(
        state: BaseAgentState,
        index: number,
        output: string,
        success: boolean = true
    ): void {
        if (state.toolExecutions[index]) {
            state.toolExecutions[index].toolOutput = output;
            state.toolExecutions[index].status = success ? 'completed' : 'error';
            state.toolExecutions[index].completedAt = new Date();
        }
    }

    // Format messages for LLM including system prompt
    protected formatMessages(state: BaseAgentState): BaseMessage[] {
        return [this.getSystemMessage(), ...state.messages];
    }

    // Extract the last user message
    protected getLastUserMessage(state: BaseAgentState): string {
        const userMessages = state.messages.filter(m => m._getType() === 'human');
        const lastMessage = userMessages[userMessages.length - 1];
        return lastMessage ? String(lastMessage.content) : '';
    }

    // Abstract method - each agent must implement its own graph
    abstract createGraph(): unknown;

    // Abstract method - invoke the agent
    abstract invoke(
        input: string,
        sessionId: string,
        existingState?: Partial<BaseAgentState>
    ): Promise<{
        response: string;
        state: BaseAgentState;
    }>;
}

// Utility function to create a streaming callback handler
export function createStreamingHandler(
    onToken: (token: string) => void,
    onToolStart?: (toolName: string, input: unknown) => void,
    onToolEnd?: (toolName: string, output: string) => void
) {
    return {
        handleLLMNewToken: (token: string) => {
            onToken(token);
        },
        handleToolStart: (
            tool: { name: string },
            input: string
        ) => {
            if (onToolStart) {
                onToolStart(tool.name, JSON.parse(input));
            }
        },
        handleToolEnd: (output: string) => {
            if (onToolEnd) {
                onToolEnd('', output);
            }
        },
    };
}
