// Input payload/config passed to each processor.
export type ProcessorInput = {
  payload: Record<string, unknown>;
  config: Record<string, unknown>;
  jobId?: string;
  actionType?: string;
};

// Standard processor output shape.
export type ProcessorOutput = {
  result: Record<string, unknown>;
};

// Contract each processor implementation must follow.
export interface IProcessor {
  process(input: ProcessorInput): Promise<ProcessorOutput>;
}
