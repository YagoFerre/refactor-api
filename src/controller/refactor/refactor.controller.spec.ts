import { Test, TestingModule } from '@nestjs/testing';
import { RefactorController } from './refactor.controller';

describe('RefactorController', () => {
  let controller: RefactorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefactorController],
    }).compile();

    controller = module.get<RefactorController>(RefactorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
