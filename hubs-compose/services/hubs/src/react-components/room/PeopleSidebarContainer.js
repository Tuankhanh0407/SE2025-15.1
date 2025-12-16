import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PeopleSidebar } from "./PeopleSidebar";
import { getMicrophonePresences } from "../../utils/microphone-presence";
import ProfileEntryPanel from "../profile-entry-panel";
import { UserProfileSidebarContainer } from "./UserProfileSidebarContainer";
import { useCan } from "./hooks/useCan";
import { useRoomPermissions } from "./hooks/useRoomPermissions";
import { useRole } from "./hooks/useRole";
import { SpeakPermissionModal } from "./SpeakPermissionModal";
import { useLectureMode } from "./hooks/useLectureMode";

export function userFromPresence(sessionId, presence, micPresences, mySessionId, voiceEnabled) {
  const meta = presence.metas[presence.metas.length - 1];
  const micPresence = micPresences.get(sessionId);
  if (micPresence && !voiceEnabled && !meta.permissions.voice_chat) {
    micPresence.muted = true;
  }
  return { id: sessionId, isMe: mySessionId === sessionId, micPresence, ...meta };
}

function usePeopleList(presences, mySessionId, micUpdateFrequency = 500) {
  const [people, setPeople] = useState([]);
  const { voice_chat: voiceChatEnabled } = useRoomPermissions();

  useEffect(() => {
    let timeout;

    function updateMicrophoneState() {
      const micPresences = getMicrophonePresences();

      setPeople(
        Object.entries(presences).map(([id, presence]) => {
          return userFromPresence(id, presence, micPresences, mySessionId, voiceChatEnabled);
        })
      );

      timeout = setTimeout(updateMicrophoneState, micUpdateFrequency);
    }

    updateMicrophoneState();

    return () => {
      clearTimeout(timeout);
    };
  }, [presences, micUpdateFrequency, setPeople, mySessionId, voiceChatEnabled]);

  return people;
}

// Helper to check if a user is a teacher
function checkIsUserTeacher(user) {
  if (user?.profile?.isTeacher !== undefined) {
    return user.profile.isTeacher;
  }
  return user?.roles?.owner || user?.roles?.creator || false;
}

function PeopleListContainer({ hubChannel, people, onSelectPerson, onClose }) {
  const onMuteAll = useCallback(() => {
    for (const person of people) {
      if (person.presence === "room" && person.permissions && !person.permissions.mute_users) {
        hubChannel.mute(person.id);
      }
    }
  }, [people, hubChannel]);
  const canVoiceChat = useCan("voice_chat");
  const { voice_chat: voiceChatEnabled } = useRoomPermissions();
  const isMod = useRole("owner");

  return (
    <PeopleSidebar
      people={people}
      onSelectPerson={onSelectPerson}
      onClose={onClose}
      onMuteAll={onMuteAll}
      showMuteAll={hubChannel.can("mute_users")}
      canVoiceChat={canVoiceChat}
      voiceChatEnabled={voiceChatEnabled}
      isMod={isMod}
    />
  );
}

PeopleListContainer.propTypes = {
  onSelectPerson: PropTypes.func.isRequired,
  hubChannel: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  people: PropTypes.array.isRequired
};

export function PeopleSidebarContainer({
  hubChannel,
  presences,
  mySessionId,
  displayNameOverride,
  store,
  mediaSearchStore,
  performConditionalSignIn,
  onCloseDialog,
  showNonHistoriedDialog,
  onClose
}) {
  const people = usePeopleList(presences, mySessionId);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [showSpeakModal, setShowSpeakModal] = useState(false);
  const selectedPerson = people.find(person => person.id === selectedPersonId);

  const {
    lectureModeEnabled,
    isTeacher,
    hasSpeakingPermission,
    grantSpeakingPermission,
    revokeSpeakingPermission
  } = useLectureMode();

  const setSelectedPerson = useCallback(
    person => {
      const personIsTeacher = checkIsUserTeacher(person);

      // Show speak modal if:
      // - Current user is teacher AND
      // - Person clicked is NOT a teacher AND
      // - Person is not "me" AND
      // - (Lecture mode is on OR the student has their hand raised)
      const shouldShowSpeakModal = isTeacher &&
        !personIsTeacher &&
        person.id !== mySessionId &&
        (lectureModeEnabled || person.hand_raised);

      if (shouldShowSpeakModal) {
        setSelectedPersonId(person.id);
        setShowSpeakModal(true);
      } else {
        setSelectedPersonId(person.id);
        setShowSpeakModal(false);
      }
    },
    [setSelectedPersonId, lectureModeEnabled, isTeacher, mySessionId]
  );


  const closeSpeakModal = useCallback(() => {
    setShowSpeakModal(false);
    setSelectedPersonId(null);
  }, []);

  const handleGrant = useCallback(() => {
    if (selectedPersonId) {
      grantSpeakingPermission(selectedPersonId);
      closeSpeakModal();
    }
  }, [selectedPersonId, grantSpeakingPermission, closeSpeakModal]);

  const handleRevoke = useCallback(() => {
    if (selectedPersonId) {
      revokeSpeakingPermission(selectedPersonId);
      closeSpeakModal();
    }
  }, [selectedPersonId, revokeSpeakingPermission, closeSpeakModal]);

  // Show speak permission modal
  if (showSpeakModal && selectedPerson) {
    const hasPermission = hasSpeakingPermission(selectedPersonId);
    return (
      <SpeakPermissionModal
        displayName={selectedPerson.profile?.displayName || "User"}
        hasPermission={hasPermission}
        handRaised={selectedPerson.hand_raised}
        onGrant={handleGrant}
        onRevoke={handleRevoke}
        onClose={closeSpeakModal}
      />
    );
  }

  if (selectedPerson && !showSpeakModal) {
    if (selectedPerson.id === mySessionId) {
      return (
        <ProfileEntryPanel
          containerType="sidebar"
          displayNameOverride={displayNameOverride}
          store={store}
          mediaSearchStore={mediaSearchStore}
          finished={() => setSelectedPersonId(null)}
          history={history}
          showBackButton
          onBack={() => setSelectedPersonId(null)}
        />
      );
    } else {
      return (
        <UserProfileSidebarContainer
          user={selectedPerson}
          hubChannel={hubChannel}
          performConditionalSignIn={performConditionalSignIn}
          showBackButton
          onBack={() => setSelectedPersonId(null)}
          onCloseDialog={onCloseDialog}
          showNonHistoriedDialog={showNonHistoriedDialog}
        />
      );
    }
  }

  return (
    <PeopleListContainer onSelectPerson={setSelectedPerson} onClose={onClose} hubChannel={hubChannel} people={people} />
  );
}

PeopleSidebarContainer.propTypes = {
  displayNameOverride: PropTypes.string,
  store: PropTypes.object.isRequired,
  mediaSearchStore: PropTypes.object.isRequired,
  hubChannel: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  mySessionId: PropTypes.string.isRequired,
  presences: PropTypes.object.isRequired,
  performConditionalSignIn: PropTypes.func.isRequired,
  onCloseDialog: PropTypes.func.isRequired,
  showNonHistoriedDialog: PropTypes.func.isRequired
};

