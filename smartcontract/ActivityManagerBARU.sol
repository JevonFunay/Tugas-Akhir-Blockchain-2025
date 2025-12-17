// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICampusPoint {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

interface IActivityCertificate {
    function mintCertificate(
        address to,
        string memory uri
    ) external returns (uint256);
}

contract ActivityManager {
    struct Activity {
        uint256 id;
        string name;
        uint256 pointReward;
        bool isActive;
        bool isEnded;
    }

    struct CertificateRequest {
        uint256 id;
        address student;
        string name;
        string description;
        string tokenURI;
        uint8 status; // 0=pending, 1=approved, 2=rejected
    }

    address public owner;
    ICampusPoint public campusPoint;
    IActivityCertificate public activityCert;

    uint256 public nextActivityId = 1;
    uint256 public nextRequestId = 1;

    mapping(uint256 => Activity) public activities;
    mapping(uint256 => CertificateRequest) public requests;

    // Attendance tracking
    mapping(uint256 => address[]) public attendees;
    mapping(uint256 => mapping(address => bool)) public hasAttended;
    mapping(uint256 => mapping(address => bool)) public hasReceivedReward;
    mapping(uint256 => mapping(address => bool)) public hasReceivedCertificate;

    event ActivityCreated(uint256 indexed id, string name, uint256 pointReward);
    event ActivityEnded(uint256 indexed id);
    event StudentAttended(uint256 indexed activityId, address indexed student);
    event StudentRewarded(
        uint256 indexed activityId,
        address indexed student,
        uint256 pointReward
    );
    event CertificateMinted(
        uint256 indexed activityId,
        address indexed student,
        uint256 tokenId,
        string uri
    );
    event CertificateRequested(
        uint256 indexed requestId,
        address indexed student,
        string name
    );
    event RequestApproved(
        uint256 indexed requestId,
        address indexed student,
        uint256 tokenId
    );
    event RequestRejected(uint256 indexed requestId, address indexed student);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(address campusPointAddress, address activityCertAddress) {
        owner = msg.sender;
        campusPoint = ICampusPoint(campusPointAddress);
        activityCert = IActivityCertificate(activityCertAddress);
    }

    // ===== Activity Functions =====
    function createActivity(
        string calldata name,
        uint256 pointReward
    ) external onlyOwner {
        uint256 activityId = nextActivityId;
        nextActivityId += 1;
        activities[activityId] = Activity({
            id: activityId,
            name: name,
            pointReward: pointReward,
            isActive: true,
            isEnded: false
        });
        emit ActivityCreated(activityId, name, pointReward);
    }

    function setActivityActive(
        uint256 activityId,
        bool active
    ) external onlyOwner {
        require(activities[activityId].id != 0, "Activity not found");
        activities[activityId].isActive = active;
    }

    function endActivity(uint256 activityId) external onlyOwner {
        require(activities[activityId].id != 0, "Activity not found");
        require(!activities[activityId].isEnded, "Activity already ended");
        activities[activityId].isEnded = true;
        activities[activityId].isActive = false;
        emit ActivityEnded(activityId);
    }

    function getActivity(
        uint256 activityId
    )
        external
        view
        returns (
            uint256 id,
            string memory name,
            uint256 pointReward,
            bool isActive,
            bool isEnded
        )
    {
        Activity memory a = activities[activityId];
        return (a.id, a.name, a.pointReward, a.isActive, a.isEnded);
    }

    // ===== Attendance Functions =====

    // Student marks attendance
    function markAttendance(uint256 activityId) external {
        Activity memory a = activities[activityId];
        require(a.id != 0, "Activity not found");
        require(a.isActive, "Activity not active");
        require(!a.isEnded, "Activity already ended");
        require(
            !hasAttended[activityId][msg.sender],
            "Already marked attendance"
        );

        attendees[activityId].push(msg.sender);
        hasAttended[activityId][msg.sender] = true;

        emit StudentAttended(activityId, msg.sender);
    }

    // Get attendees count
    function getAttendeesCount(
        uint256 activityId
    ) external view returns (uint256) {
        return attendees[activityId].length;
    }

    // Get attendee at index
    function getAttendee(
        uint256 activityId,
        uint256 index
    ) external view returns (address) {
        require(index < attendees[activityId].length, "Index out of bounds");
        return attendees[activityId][index];
    }

    // Check if student attended
    function checkAttendance(
        uint256 activityId,
        address student
    ) external view returns (bool) {
        return hasAttended[activityId][student];
    }

    // ===== Reward Functions =====

    // Admin rewards student from attendee list
    function rewardAttendee(
        uint256 activityId,
        uint256 attendeeIndex
    ) external onlyOwner {
        Activity memory a = activities[activityId];
        require(a.id != 0, "Activity not found");
        require(a.isEnded, "Activity not ended yet");
        require(
            attendeeIndex < attendees[activityId].length,
            "Invalid attendee index"
        );

        address student = attendees[activityId][attendeeIndex];
        require(!hasReceivedReward[activityId][student], "Already rewarded");

        hasReceivedReward[activityId][student] = true;
        campusPoint.mint(student, a.pointReward);

        emit StudentRewarded(activityId, student, a.pointReward);
    }

    // Admin mints certificate for attendee
    function mintCertificateForAttendee(
        uint256 activityId,
        uint256 attendeeIndex,
        string calldata uri
    ) external onlyOwner {
        Activity memory a = activities[activityId];
        require(a.id != 0, "Activity not found");
        require(a.isEnded, "Activity not ended yet");
        require(
            attendeeIndex < attendees[activityId].length,
            "Invalid attendee index"
        );

        address student = attendees[activityId][attendeeIndex];
        require(
            !hasReceivedCertificate[activityId][student],
            "Already received certificate"
        );

        hasReceivedCertificate[activityId][student] = true;
        uint256 tokenId = activityCert.mintCertificate(student, uri);

        emit CertificateMinted(activityId, student, tokenId, uri);
    }

    // Legacy: Direct reward (still available)
    function rewardStudent(
        uint256 activityId,
        address student
    ) external onlyOwner {
        Activity memory a = activities[activityId];
        require(a.id != 0, "Activity not found");
        require(student != address(0), "Invalid student address");
        campusPoint.mint(student, a.pointReward);
        emit StudentRewarded(activityId, student, a.pointReward);
    }

    // Legacy: Direct mint certificate (still available)
    function mintCertificate(
        uint256 activityId,
        address student,
        string calldata uri
    ) external onlyOwner {
        Activity memory a = activities[activityId];
        require(a.id != 0, "Activity not found");
        require(student != address(0), "Invalid student address");
        uint256 tokenId = activityCert.mintCertificate(student, uri);
        emit CertificateMinted(activityId, student, tokenId, uri);
    }

    // ===== Certificate Request Functions =====

    function requestCertificate(
        string calldata name,
        string calldata description,
        string calldata tokenURI
    ) external {
        require(bytes(name).length > 0, "Name required");
        require(bytes(tokenURI).length > 0, "Token URI required");

        uint256 requestId = nextRequestId;
        nextRequestId += 1;

        requests[requestId] = CertificateRequest({
            id: requestId,
            student: msg.sender,
            name: name,
            description: description,
            tokenURI: tokenURI,
            status: 0
        });

        emit CertificateRequested(requestId, msg.sender, name);
    }

    function getRequest(
        uint256 requestId
    )
        external
        view
        returns (
            uint256 id,
            address student,
            string memory name,
            string memory description,
            string memory tokenURI,
            uint8 status
        )
    {
        CertificateRequest memory r = requests[requestId];
        return (r.id, r.student, r.name, r.description, r.tokenURI, r.status);
    }

    function approveRequest(uint256 requestId) external onlyOwner {
        CertificateRequest storage r = requests[requestId];
        require(r.id != 0, "Request not found");
        require(r.status == 0, "Request already processed");

        r.status = 1;
        uint256 tokenId = activityCert.mintCertificate(r.student, r.tokenURI);

        emit RequestApproved(requestId, r.student, tokenId);
    }

    function rejectRequest(uint256 requestId) external onlyOwner {
        CertificateRequest storage r = requests[requestId];
        require(r.id != 0, "Request not found");
        require(r.status == 0, "Request already processed");

        r.status = 2;

        emit RequestRejected(requestId, r.student);
    }
}
