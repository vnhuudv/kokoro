import { Test } from '@nestjs/testing';
import { AppModule } from '../../../../src/services/api-gateway/src/app.module';

describe('AppModule', () => {
  it('compiles the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(module).toBeDefined();
  });
});
