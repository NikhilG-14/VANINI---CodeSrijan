import { Request, Response } from 'express';

// In a real application, you'd use Prisma or TypeORM here
// import prisma from '../models';

export const ingestTelemetry = async (req: Request, res: Response) => {
    try {
        const { userId, game, metrics } = req.body;
        
        console.log(`Received telemetry for user ${userId} from game ${game}`);
        console.dir(metrics);

        // Simulated Emotion Engine Mapping Component
        let incrementAnxiety = 0;
        let incrementFatigue = 0;

        if (game === 'FastReactionGame') {
            if (metrics.error_rate > 0.3) incrementAnxiety += 10;
            if (metrics.reaction_times && Math.min(...metrics.reaction_times) < 200) {
               incrementAnxiety += 5; 
            }
        }

        if (game === 'TimedDecisionsGame') {
            if (metrics.hesitation_time > 2000) incrementFatigue += 15;
            if (metrics.decision_changes > 3) incrementAnxiety += 10;
        }

        /* 
          // Example DB Update
          await prisma.userEmotions.update({
             where: { id: userId },
             data: {
                 anxietyScore: { increment: incrementAnxiety },
                 fatigueScore: { increment: incrementFatigue }
             }
          });
        */

        res.status(200).json({ 
            status: 'success', 
            message: 'Telemetry ingested and scores calculated safely.',
            calculatedOffsets: {
                anxiety: incrementAnxiety,
                fatigue: incrementFatigue
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Engine failure' });
    }
};
