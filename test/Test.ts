import assert from "assert";
import { TestHelpers } from "generated";

const { MockDb, PositionManager1 } = TestHelpers;

describe("PositionManager1 contract CreatorFeeAllocationUpdated event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for PositionManager1 contract CreatorFeeAllocationUpdated event
  const event = PositionManager1.CreatorFeeAllocationUpdated.createMockEvent({
    /* It mocks event fields with default values. You can overwrite them if you need */
  });

  it("PositionManager1_CreatorFeeAllocationUpdated is processed correctly", async () => {
    // Processing the event
    const mockDbUpdated = await PositionManager1.CreatorFeeAllocationUpdated.processEvent({
      event,
      mockDb,
    });

    // Assert that the event was processed without errors
    assert.ok(mockDbUpdated, "Event should be processed successfully");
  });
});
