import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { CloudflareDelivery } from './video-delivery';
import { CloudflareStreamClient } from './cloudflare-stream.client';
import { MockHlsDelivery } from './mock-hls.delivery';
import { readVideoMode } from './video-env';
import { VIDEO_DELIVERY, type VideoDelivery } from './video.types';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  imports: [ProgressModule],
  controllers: [VideoController],
  providers: [
    VideoService,
    CloudflareStreamClient,
    CloudflareDelivery,
    MockHlsDelivery,
    {
      provide: VIDEO_DELIVERY,
      useFactory: (cloudflare: CloudflareDelivery, mock: MockHlsDelivery): VideoDelivery =>
        readVideoMode() === 'mock' ? mock : cloudflare,
      inject: [CloudflareDelivery, MockHlsDelivery],
    },
  ],
})
export class VideoModule {}
