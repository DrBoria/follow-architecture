"use strict";

// The ids shared by the report and the picture.
module.exports = {
	// a relation the architecture forbids
	WRONG_ACTION: "wrongAction",
	// the code is in the wrong place (move, or split between places)
	WRONG_PLACEMENT: "wrongPlacement",
	// nothing declares this kind of code here
	UNKNOWN_ROLE: "unknownRole",
	// the finding judges the file's own contents
	FILE_CONTENTS: "fileContents",
};
