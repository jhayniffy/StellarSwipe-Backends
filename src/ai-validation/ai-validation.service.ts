import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { ValidationResult, XaiResponse } from "./interfaces/xai-client.interface";

@Injectable()
export class AiValidationService {
  private readonly logger = new Logger(AiValidationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async validateSignal(
    assetPair: string,
    action: string,
    rationale: string,
  ): Promise<ValidationResult> {
    const apiKey = this.configService.get<string>("xai.apiKey");
    const model = this.configService.get<string>("xai.model");
    const apiUrl = this.configService.get<string>("xai.apiUrl");

    if (!apiKey) {
      this.logger.warn("XAI_API_KEY is not set. Falling back to default validation.");
      return { score: 50, feedback: "API Key missing, manual review required.", isSpam: false };
    }

    const prompt = `
      Analyze the following crypto trading signal and provide a quality score (0-100), 
      brief feedback, and spam detection.
      
      Asset Pair: ${assetPair}
      Action: ${action}
      Rationale: ${rationale}
      
      Your response MUST be in JSON format:
      {
        "score": number,
        "feedback": "string",
        "isSpam": boolean
      }
      
      Criteria:
      - Rationale coherence and specificity (0-40 points)
      - Realistic price targets if any (0-20 points)
      - Market data references (0-20 points)
      - Spam/manipulation detection (0-20 points)
      - Signals with vague rationales like "to the moon" or "trust me" should score very low.
    `;

    try {
      if (!apiUrl) {
        throw new Error("XAI_API_URL is not set in config.");
      }
      const response = await firstValueFrom(
        this.httpService.post<XaiResponse>(
          apiUrl,
          {
            model: model,
            messages: [
              { role: "system", content: "You are a professional crypto market analyst." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000, // 10 seconds timeout as requested
          },
        ),
      );

      const content = response.data.choices[0].message.content;
      const result: ValidationResult = JSON.parse(content);
      
      this.logger.log(`Signal validation result: Score ${result.score}, Spam: ${result.isSpam}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error validating signal with xAI: ${error.message}`);
      // Fallback as requested: handle timeouts/errors gracefully (default to manual review)
      return {
        score: 50, // Neutral score to avoid auto-rejection but flag for review
        feedback: `Validation failed due to API error: ${error.message || "Unknown error"}. Manual review recommended.`,
        isSpam: false,
      };
    }
  }
}
