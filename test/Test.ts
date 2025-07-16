import assert from "assert";
import { 
  TestHelpers,
  PositionManager_CreatorFeeAllocationUpdated
} from "generated";
const { MockDb, PositionManager } = TestHelpers;

describe("PositionManager contract CreatorFeeAllocationUpdated event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for PositionManager contract CreatorFeeAllocationUpdated event
  const event = PositionManager.CreatorFeeAllocationUpdated.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("PositionManager_CreatorFeeAllocationUpdated is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await PositionManager.CreatorFeeAllocationUpdated.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualPositionManagerCreatorFeeAllocationUpdated = mockDbUpdated.entities.PositionManager_CreatorFeeAllocationUpdated.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedPositionManagerCreatorFeeAllocationUpdated: PositionManager_CreatorFeeAllocationUpdated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      _poolId: event.params._poolId,
      _allocation: event.params._allocation,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualPositionManagerCreatorFeeAllocationUpdated, expectedPositionManagerCreatorFeeAllocationUpdated, "Actual PositionManagerCreatorFeeAllocationUpdated should be the same as the expectedPositionManagerCreatorFeeAllocationUpdated");
  });
});
