// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PrivateVoting {
    struct Election {
        uint256 id;
        string title;
        string[] candidates;
        uint256 startTime;
        uint256 endTime;
        bool isPublic;
        bool isClosed;
        address creator;
    }

    uint256 private _nextElectionId;

    mapping(uint256 => Election) private elections;
    mapping(uint256 => uint256[]) private voteCounts;
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    mapping(uint256 => mapping(address => bool)) private whitelist;

    event ElectionCreated(
        uint256 indexed electionId,
        address indexed creator,
        string title,
        uint256 startTime,
        uint256 endTime,
        bool isPublic
    );

    event VoterAuthorized(
        uint256 indexed electionId,
        address indexed voter
    );

    event VoterRevoked(
        uint256 indexed electionId,
        address indexed voter
    );

    event VoteSubmitted(
        uint256 indexed electionId,
        address indexed voter
    );

    event ElectionClosed(
        uint256 indexed electionId,
        address indexed closer
    );

    error ElectionNotFound();
    error NotElectionCreator();
    error InvalidTimeRange();
    error InvalidCandidateList();
    error ElectionAlreadyClosed();
    error ElectionNotStarted();
    error ElectionEnded();
    error VotingNotAllowed();
    error AlreadyVoted();
    error InvalidCandidateIndex();
    error ElectionStillActive();
    error ElectionEndTimeNotReached();

    modifier electionExists(uint256 electionId) {
        if (electionId >= _nextElectionId) {
            revert ElectionNotFound();
        }
        _;
    }

    modifier onlyElectionCreator(uint256 electionId) {
        if (elections[electionId].creator != msg.sender) {
            revert NotElectionCreator();
        }
        _;
    }

    constructor() {
        _nextElectionId = 0;
    }

    function createElection(
        string memory title,
        string[] memory candidates,
        uint256 startTime,
        uint256 endTime,
        bool isPublic
    ) external {
        if (startTime >= endTime) {
            revert InvalidTimeRange();
        }

        if (candidates.length < 2) {
            revert InvalidCandidateList();
        }

        uint256 electionId = _nextElectionId;
        _nextElectionId++;

        Election storage e = elections[electionId];
        e.id = electionId;
        e.title = title;
        e.startTime = startTime;
        e.endTime = endTime;
        e.isPublic = isPublic;
        e.isClosed = false;
        e.creator = msg.sender;

        for (uint256 i = 0; i < candidates.length; i++) {
            bytes memory nameBytes = bytes(candidates[i]);
            require(nameBytes.length > 0, "Candidate name cannot be empty");
            e.candidates.push(candidates[i]);
            voteCounts[electionId].push(0);
        }

        emit ElectionCreated(
            electionId,
            msg.sender,
            title,
            startTime,
            endTime,
            isPublic
        );
    }

    function authorizeVoter(
        uint256 electionId,
        address voter
    )
        external
        electionExists(electionId)
        onlyElectionCreator(electionId)
    {
        whitelist[electionId][voter] = true;
        emit VoterAuthorized(electionId, voter);
    }

    function authorizeManyVoters(
        uint256 electionId,
        address[] calldata voters
    )
        external
        electionExists(electionId)
        onlyElectionCreator(electionId)
    {
        for (uint256 i = 0; i < voters.length; i++) {
            whitelist[electionId][voters[i]] = true;
            emit VoterAuthorized(electionId, voters[i]);
        }
    }

    function revokeVoter(
        uint256 electionId,
        address voter
    )
        external
        electionExists(electionId)
        onlyElectionCreator(electionId)
    {
        whitelist[electionId][voter] = false;
        emit VoterRevoked(electionId, voter);
    }

    function vote(
        uint256 electionId,
        uint256 candidateIndex
    ) external electionExists(electionId) {
        Election storage e = elections[electionId];

        if (e.isClosed) {
            revert ElectionAlreadyClosed();
        }

        if (block.timestamp < e.startTime) {
            revert ElectionNotStarted();
        }

        if (block.timestamp > e.endTime) {
            revert ElectionEnded();
        }

        if (!e.isPublic && !whitelist[electionId][msg.sender]) {
            revert VotingNotAllowed();
        }

        if (hasVoted[electionId][msg.sender]) {
            revert AlreadyVoted();
        }

        if (candidateIndex >= e.candidates.length) {
            revert InvalidCandidateIndex();
        }

        hasVoted[electionId][msg.sender] = true;
        voteCounts[electionId][candidateIndex] += 1;

        emit VoteSubmitted(electionId, msg.sender);
    }

    function closeElection(
        uint256 electionId
    )
        external
        electionExists(electionId)
        onlyElectionCreator(electionId)
    {
        Election storage e = elections[electionId];

        if (e.isClosed) {
            revert ElectionAlreadyClosed();
        }

        if (block.timestamp < e.endTime) {
            revert ElectionEndTimeNotReached();
        }

        e.isClosed = true;

        emit ElectionClosed(electionId, msg.sender);
    }

    function getElection(
        uint256 electionId
    )
        external
        view
        electionExists(electionId)
        returns (Election memory)
    {
        return elections[electionId];
    }

    function getResults(
        uint256 electionId
    )
        external
        view
        electionExists(electionId)
        returns (uint256[] memory)
    {
        Election storage e = elections[electionId];

        if (!e.isClosed && block.timestamp <= e.endTime) {
            revert ElectionStillActive();
        }

        return voteCounts[electionId];
    }

    function getCandidates(
        uint256 electionId
    )
        external
        view
        electionExists(electionId)
        returns (string[] memory)
    {
        return elections[electionId].candidates;
    }

    function getElectionCount() external view returns (uint256) {
        return _nextElectionId;
    }

    function hasUserVoted(
        uint256 electionId,
        address user
    )
        external
        view
        electionExists(electionId)
        returns (bool)
    {
        return hasVoted[electionId][user];
    }

    function isVoterAuthorized(
        uint256 electionId,
        address user
    )
        external
        view
        electionExists(electionId)
        returns (bool)
    {
        Election storage e = elections[electionId];

        if (e.isPublic) {
            return true;
        }

        return whitelist[electionId][user];
    }

    function getElectionStatus(
        uint256 electionId
    )
        external
        view
        electionExists(electionId)
        returns (
            bool started,
            bool ended,
            bool closed,
            bool active
        )
    {
        Election storage e = elections[electionId];

        started = block.timestamp >= e.startTime;
        ended = block.timestamp > e.endTime;
        closed = e.isClosed;
        active = started && !ended && !closed;
    }

    function getTotalVotes(
        uint256 electionId
    )
        external
        view
        electionExists(electionId)
        returns (uint256 total)
    {
        uint256[] storage counts = voteCounts[electionId];
        for (uint256 i = 0; i < counts.length; i++) {
            total += counts[i];
        }
    }
}
