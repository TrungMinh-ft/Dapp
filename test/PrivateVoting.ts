import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PrivateVoting", function () {
  async function deployPrivateVotingFixture() {
    const [creator, voter, other] = await hre.ethers.getSigners();
    const Voting = await hre.ethers.getContractFactory("PrivateVoting");
    const voting = await Voting.deploy();

    return { voting, creator, voter, other };
  }

  async function createPublicElectionFixture() {
    const fixture = await deployPrivateVotingFixture();
    const now = await time.latest();

    await fixture.voting.createElection(
      "Class Leader",
      ["Alice", "Bob"],
      now,
      now + 3600,
      true,
    );

    return { ...fixture, electionId: 0 };
  }

  async function createPrivateElectionFixture() {
    const fixture = await deployPrivateVotingFixture();
    const now = await time.latest();

    await fixture.voting.createElection(
      "Private Vote",
      ["Alice", "Bob"],
      now,
      now + 3600,
      false,
    );

    return { ...fixture, electionId: 0 };
  }

  it("creates an election and exposes its metadata", async function () {
    const { voting, creator, electionId } = await loadFixture(createPublicElectionFixture);

    expect(await voting.getElectionCount()).to.equal(1n);

    const election = await voting.getElection(electionId);
    expect(election.id).to.equal(0n);
    expect(election.title).to.equal("Class Leader");
    expect(election.creator).to.equal(creator.address);
    expect(election.isPublic).to.equal(true);
    expect(election.candidates).to.deep.equal(["Alice", "Bob"]);
  });

  it("rejects elections with fewer than two candidates", async function () {
    const { voting } = await loadFixture(deployPrivateVotingFixture);
    const now = await time.latest();

    await expect(
      voting.createElection("Invalid", ["Solo"], now, now + 3600, true),
    ).to.be.revertedWithCustomError(voting, "InvalidCandidateList");
  });

  it("allows public voting, tracks status and returns results once closed", async function () {
    const { voting, voter, electionId } = await loadFixture(createPublicElectionFixture);

    await expect(voting.connect(voter).vote(electionId, 1)).to.emit(voting, "VoteSubmitted");

    expect(await voting.hasUserVoted(electionId, voter.address)).to.equal(true);
    expect(await voting.getTotalVotes(electionId)).to.equal(1n);

    await expect(voting.getResults(electionId)).to.be.revertedWithCustomError(
      voting,
      "ElectionStillActive",
    );

    await time.increase(3601);
    await voting.closeElection(electionId);
    expect(await voting.getResults(electionId)).to.deep.equal([0n, 1n]);
  });

  it("requires whitelisting for private elections", async function () {
    const { voting, creator, voter, electionId } = await loadFixture(createPrivateElectionFixture);

    await expect(voting.connect(voter).vote(electionId, 0)).to.be.revertedWithCustomError(
      voting,
      "VotingNotAllowed",
    );

    await voting.connect(creator).authorizeVoter(electionId, voter.address);
    expect(await voting.isVoterAuthorized(electionId, voter.address)).to.equal(true);

    await expect(voting.connect(voter).vote(electionId, 0)).to.emit(voting, "VoteSubmitted");
  });

  it("prevents non-creators from closing elections", async function () {
    const { voting, other, electionId } = await loadFixture(createPublicElectionFixture);

    await expect(voting.connect(other).closeElection(electionId)).to.be.revertedWithCustomError(
      voting,
      "NotElectionCreator",
    );
  });

  it("does not allow closing an election before the end time", async function () {
    const { voting, electionId } = await loadFixture(createPublicElectionFixture);

    await expect(voting.closeElection(electionId)).to.be.revertedWithCustomError(
      voting,
      "ElectionEndTimeNotReached",
    );
  });

  it("marks ended elections as inactive in the status helper", async function () {
    const { voting, electionId } = await loadFixture(createPublicElectionFixture);

    await time.increase(3601);
    const status = await voting.getElectionStatus(electionId);

    expect(status.started).to.equal(true);
    expect(status.ended).to.equal(true);
    expect(status.closed).to.equal(false);
    expect(status.active).to.equal(false);
  });
});
