import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvaluatorController } from './evaluator.controller';
import { EvaluatorService } from './evaluator.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [AppController, EvaluatorController],
  providers: [AppService, EvaluatorService],
})
export class AppModule {}
