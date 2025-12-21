import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import classNames from "classnames";
import configs from "../../utils/configs";
import { CreateRoomButton } from "./CreateRoomButton";
import { PWAButton } from "./PWAButton";
import { useFavoriteRooms } from "./useFavoriteRooms";
import { usePublicRooms } from "./usePublicRooms";
import styles from "./HomePage.scss";
import { AuthContext } from "../auth/AuthContext";
import { createAndRedirectToNewHub } from "../../utils/phoenix-utils";
import { MediaGrid } from "../room/MediaGrid";
import { MediaTile } from "../room/MediaTiles";
import { PageContainer } from "../layout/PageContainer";
import { scaledThumbnailUrlFor } from "../../utils/media-url-utils";
import { Column } from "../layout/Column";
import { Container } from "../layout/Container";
import { SocialBar } from "../home/SocialBar";
import { SignInButton } from "./SignInButton";
import { AppLogo } from "../misc/AppLogo";
import { isHmc } from "../../utils/isHmc";
import maskEmail from "../../utils/mask-email";
import { TextInputField } from "../input/TextInputField";
import { Button } from "../input/Button";

export function HomePage() {
  const auth = useContext(AuthContext);
  const intl = useIntl();

  const [joinValue, setJoinValue] = useState("");

  const joinPlaceholder = useMemo(() => {
    return intl.formatMessage({
      id: "home-page.join.placeholder",
      defaultMessage: "Paste class link or enter room code"
    });
  }, [intl]);

  const { results: favoriteRooms } = useFavoriteRooms();
  const { results: publicRooms } = usePublicRooms();

  const sortedFavoriteRooms = Array.from(favoriteRooms).sort((a, b) => b.member_count - a.member_count);
  const sortedPublicRooms = Array.from(publicRooms).sort((a, b) => b.member_count - a.member_count);
  const wrapInBold = chunk => <b>{chunk}</b>;

  const onJoinChange = useCallback(e => {
    setJoinValue(e.target.value);
  }, []);

  const onJoinSubmit = useCallback(
    e => {
      e.preventDefault();
      const raw = (joinValue || "").trim();
      if (!raw) return;

      // Accept full URLs, paths, or short room codes.
      if (/^https?:\/\//i.test(raw)) {
        window.location = raw;
        return;
      }

      if (raw.startsWith("/")) {
        window.location = raw;
        return;
      }

      window.location = `/${raw}`;
    },
    [joinValue]
  );
  useEffect(() => {
    document.body.classList.add("home-page-scroll-lock");

    const qs = new URLSearchParams(location.search);

    // Support legacy sign in urls.
    if (qs.has("sign_in")) {
      const redirectUrl = new URL("/signin", window.location);
      redirectUrl.search = location.search;
      window.location = redirectUrl;
    } else if (qs.has("auth_topic")) {
      const redirectUrl = new URL("/verify", window.location);
      redirectUrl.search = location.search;
      window.location = redirectUrl;
    }

    if (qs.has("new")) {
      qs.delete("new");
      createAndRedirectToNewHub(null, null, true, qs);
    }

    return () => {
      document.body.classList.remove("home-page-scroll-lock");
    };
  }, []);

  const canCreateRooms = !configs.feature("disable_room_creation") || auth.isAdmin;
  const email = auth.email;
  return (
    <PageContainer className={styles.homePage}>
      <Container>
        <div className={styles.hero}>
          {auth.isSignedIn ? (
            <div className={styles.signInContainer}>
              <span>
                <FormattedMessage
                  id="header.signed-in-as"
                  defaultMessage="Signed in as {email}"
                  values={{ email: maskEmail(email) }}
                />
              </span>
              <a href="#" onClick={auth.signOut} className={styles.mobileSignOut}>
                <FormattedMessage id="header.sign-out" defaultMessage="Sign Out" />
              </a>
            </div>
          ) : (
            <SignInButton mobile />
          )}
          <div className={styles.logoContainer}>
            <AppLogo />
          </div>
          <div className={styles.appInfo}>
            <div className={styles.appDescription}>{configs.translation("app-description")}</div>

            <div className={styles.ctaGrid}>
              <div className={styles.ctaSectionCard}>
                <div className={styles.ctaSectionHeader}>
                  <div className={styles.ctaSectionKicker}>
                    <FormattedMessage id="home-page.cta.student.kicker" defaultMessage="Student" />
                  </div>
                  <div className={styles.ctaSectionTitle}>
                    <FormattedMessage id="home-page.cta.student.title" defaultMessage="Join a class" />
                  </div>
                </div>

                <form className={styles.joinCard} onSubmit={onJoinSubmit}>
                  <div className={styles.joinRow}>
                    <TextInputField
                      name="join"
                      type="text"
                      value={joinValue}
                      onChange={onJoinChange}
                      placeholder={joinPlaceholder}
                      fullWidth
                    />
                    <Button preset="primary" className={styles.joinButton} type="submit">
                      <FormattedMessage id="home-page.join.cta" defaultMessage="Join" />
                    </Button>
                  </div>
                  <div className={styles.joinHint}>
                    <FormattedMessage
                      id="home-page.join.hint"
                      defaultMessage="Tip: you can paste an invite link from your teacher or enter the room code."
                    />
                  </div>
                </form>
              </div>

              <div className={styles.ctaSectionCard}>
                <div className={styles.ctaSectionHeader}>
                  <div className={styles.ctaSectionKicker}>
                    <FormattedMessage id="home-page.cta.teacher.kicker" defaultMessage="Teacher" />
                  </div>
                  <div className={styles.ctaSectionTitle}>
                    <FormattedMessage id="home-page.cta.teacher.title" defaultMessage="Create a room" />
                  </div>
                </div>

                <div className={styles.teacherActions}>
                  {canCreateRooms && <CreateRoomButton />}
                  <PWAButton />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.heroPanel}>
            <div className={styles.heroPanelHeader}>
              <div className={styles.heroPanelTitle}>
                <FormattedMessage id="home-page.preview.title" defaultMessage="Classroom Preview" />
              </div>
              <div className={styles.heroPanelSubtitle}>
                <FormattedMessage
                  id="home-page.preview.subtitle"
                  defaultMessage="A clean, distraction-free space for online lessons."
                />
              </div>
            </div>

            <div className={styles.heroPanelGrid}>
              <div className={styles.heroPanelCard}>
                <div className={styles.heroPanelCardTitle}>
                  <FormattedMessage id="home-page.preview.feature.audio" defaultMessage="Live audio & chat" />
                </div>
                <div className={styles.heroPanelCardText}>
                  <FormattedMessage
                    id="home-page.preview.feature.audio.text"
                    defaultMessage="Communicate clearly with voice and text."
                  />
                </div>
              </div>
              <div className={styles.heroPanelCard}>
                <div className={styles.heroPanelCardTitle}>
                  <FormattedMessage id="home-page.preview.feature.media" defaultMessage="Share learning materials" />
                </div>
                <div className={styles.heroPanelCardText}>
                  <FormattedMessage
                    id="home-page.preview.feature.media.text"
                    defaultMessage="Drop PDFs, videos, links and 3D models into the room."
                  />
                </div>
              </div>
              <div className={styles.heroPanelCard}>
                <div className={styles.heroPanelCardTitle}>
                  <FormattedMessage id="home-page.preview.feature.private" defaultMessage="Private by default" />
                </div>
                <div className={styles.heroPanelCardText}>
                  <FormattedMessage
                    id="home-page.preview.feature.private.text"
                    defaultMessage="Invite-only access with safe sharing links."
                  />
                </div>
              </div>
              <div className={styles.heroPanelCard}>
                <div className={styles.heroPanelCardTitle}>
                  <FormattedMessage id="home-page.preview.feature.fast" defaultMessage="Fast to start" />
                </div>
                <div className={styles.heroPanelCardText}>
                  <FormattedMessage
                    id="home-page.preview.feature.fast.text"
                    defaultMessage="Create a room in seconds. No installs required."
                  />
                </div>
              </div>
            </div>

            <div className={styles.heroPanelFooter}>
              <div className={styles.heroPanelFooterItem}>
                <FormattedMessage id="home-page.preview.footer.teacher" defaultMessage="Teacher" />
                : <b>
                  <FormattedMessage id="home-page.preview.footer.teacher.value" defaultMessage="Create Room" />
                </b>
              </div>
              <div className={styles.heroPanelFooterItem}>
                <FormattedMessage id="home-page.preview.footer.student" defaultMessage="Student" />
                : <b>
                  <FormattedMessage id="home-page.preview.footer.student.value" defaultMessage="Join a class" />
                </b>
              </div>
            </div>
          </div>
        </div>
      </Container>
      {configs.feature("show_feature_panels") && (
        <Container className={classNames(styles.features, styles.colLg, styles.centerLg)}>
          <Column padding gap="xl" className={styles.card}>
            <img src={configs.image("landing_rooms_thumb")} />
            <h3>
              <FormattedMessage id="home-page.rooms-title" defaultMessage="Instantly create rooms" />
            </h3>
            <p>
              <FormattedMessage
                id="home-page.rooms-blurb"
                defaultMessage="Share virtual spaces with your friends, co-workers, and communities. When you create a room with Hubs, you’ll have a private virtual meeting space that you can instantly share <b>- no downloads or VR headset necessary.</b>"
                values={{ b: wrapInBold }}
              />
            </p>
          </Column>
          <Column padding gap="xl" className={styles.card}>
            <img src={configs.image("landing_communicate_thumb")} />
            <h3>
              <FormattedMessage id="home-page.communicate-title" defaultMessage="Communicate and Collaborate" />
            </h3>
            <p>
              <FormattedMessage
                id="home-page.communicate-blurb"
                defaultMessage="Choose an avatar to represent you, put on your headphones, and jump right in. Hubs makes it easy to stay connected with voice and text chat to other people in your private room."
              />
            </p>
          </Column>
          <Column padding gap="xl" className={styles.card}>
            <img src={configs.image("landing_media_thumb")} />
            <h3>
              <FormattedMessage id="home-page.media-title" defaultMessage="An easier way to share media" />
            </h3>
            <p>
              <FormattedMessage
                id="home-page.media-blurb"
                defaultMessage="Share content with others in your room by dragging and dropping photos, videos, PDF files, links, and 3D models into your space."
              />
            </p>
          </Column>
        </Container>
      )}
      {sortedPublicRooms.length > 0 && (
        <Container className={styles.roomsContainer}>
          <h3 className={styles.roomsHeading}>
            <FormattedMessage id="home-page.public--rooms" defaultMessage="Public Rooms" />
          </h3>
          <Column grow padding className={styles.rooms}>
            <MediaGrid center>
              {sortedPublicRooms.map(room => {
                return (
                  <MediaTile
                    key={room.id}
                    entry={room}
                    processThumbnailUrl={(entry, width, height) =>
                      scaledThumbnailUrlFor(entry.images.preview.url, width, height)
                    }
                  />
                );
              })}
            </MediaGrid>
          </Column>
        </Container>
      )}
      {sortedFavoriteRooms.length > 0 && (
        <Container className={styles.roomsContainer}>
          <h3 className={styles.roomsHeading}>
            <FormattedMessage id="home-page.favorite-rooms" defaultMessage="Favorite Rooms" />
          </h3>
          <Column grow padding className={styles.rooms}>
            <MediaGrid center>
              {sortedFavoriteRooms.map(room => {
                return (
                  <MediaTile
                    key={room.id}
                    entry={room}
                    processThumbnailUrl={(entry, width, height) =>
                      scaledThumbnailUrlFor(entry.images.preview.url, width, height)
                    }
                  />
                );
              })}
            </MediaGrid>
          </Column>
        </Container>
      )}
      {isHmc() ? (
        <Column center>
          <SocialBar />
        </Column>
      ) : null}
    </PageContainer>
  );
}
