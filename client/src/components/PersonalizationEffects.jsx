import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiClock, FiCpu, FiEye, FiMusic, FiUsers, FiZap } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useUiSettings } from '../context/UiSettingsContext.jsx';
import './PersonalizationEffects.css';

const LIFETIME_KEY = 'jola-lifetime-seconds';
const QUANTUM_KEY = 'jola-quantum-accent';
const quantumAccents = ['blue', 'violet', 'emerald', 'sunset'];

function formatLifetime(totalSeconds, isRu) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours <= 0) {
    return isRu ? `${minutes} мин` : `${minutes} min`;
  }

  return isRu ? `${hours} ч ${minutes} мин` : `${hours} h ${minutes} min`;
}

function getWeatherMood(preset = 'auto') {
  if (preset && preset !== 'auto') return preset;
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 17) return 'sunny';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function getEvolutionStage(totalSeconds) {
  if (totalSeconds > 6 * 3600) return 'legend';
  if (totalSeconds > 2 * 3600) return 'insider';
  return 'fresh';
}

function detectLowPowerDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const downlink = Number(connection?.downlink || 0);
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
  const isAndroid = /android/i.test(navigator.userAgent || '');

  return saveData
    || (deviceMemory > 0 && deviceMemory <= 4)
    || (hardwareConcurrency > 0 && hardwareConcurrency <= 4)
    || (isAndroid && downlink > 0 && downlink < 2.2);
}

function useViewportFlags() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return { isMobile: false, isLowPower: false };
    return {
      isMobile: window.innerWidth <= 768,
      isLowPower: detectLowPowerDevice(),
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onResize = () => {
      setState({
        isMobile: window.innerWidth <= 768,
        isLowPower: detectLowPowerDevice(),
      });
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return state;
}

function createParticles(count, generator) {
  return Array.from({ length: count }, (_, index) => ({ id: `p-${index}`, ...generator(index) }));
}

function WeatherScene({ mood, isMobile, isLowPower, reduceMotion, economyEffects, effectsQuality = 'auto', sceneMode = 'default' }) {
  const autoEconomy = isLowPower || isMobile || sceneMode === 'catalog' || sceneMode === 'editor' || sceneMode === 'profile';
  const performanceTier = reduceMotion
    ? 'reduced'
    : effectsQuality === 'off'
      ? 'off'
      : effectsQuality === 'economy'
        ? 'economy'
        : effectsQuality === 'full'
          ? (sceneMode === 'editor' && isMobile ? 'economy' : 'full')
          : economyEffects || autoEconomy
            ? 'economy'
            : 'full';

  if (performanceTier === 'off') return null;

  const isLite = performanceTier !== 'full';
  const isEconomy = performanceTier === 'economy';

  const cloudCount = performanceTier === 'reduced' ? 1 : performanceTier === 'economy' ? 1 : 4;
  const mistCount = performanceTier === 'full' ? 1 : 0;
  const rainCount = performanceTier === 'reduced' ? 2 : performanceTier === 'economy' ? 5 : 22;
  const frontRainCount = performanceTier === 'full' && !isMobile ? 5 : performanceTier === 'full' ? 2 : 0;
  const snowCount = performanceTier === 'reduced' ? 3 : performanceTier === 'economy' ? 5 : 14;
  const frontSnowCount = performanceTier === 'full' && !isMobile ? 5 : performanceTier === 'full' ? 2 : 0;
  const starCount = performanceTier === 'reduced' ? 4 : performanceTier === 'economy' ? 6 : 18;
  const sparkCount = performanceTier === 'full' && !isMobile ? 5 : 0;

  const clouds = useMemo(
    () => createParticles(cloudCount, (index) => ({
      top: `${4 + index * (isMobile ? 8 : 6) + Math.random() * 8}%`,
      left: `${-18 + Math.random() * 80}%`,
      width: `${18 + Math.random() * (isMobile ? 16 : 28)}rem`,
      height: `${5 + Math.random() * (isMobile ? 3 : 6)}rem`,
      duration: `${22 + Math.random() * 28}s`,
      delay: `${Math.random() * 8}s`,
      blur: `${6 + Math.random() * 12}px`,
      opacity: 0.18 + Math.random() * 0.26,
      scale: 0.9 + Math.random() * 0.35,
    })),
    [cloudCount, isMobile]
  );

  const fogBands = useMemo(
    () => createParticles(mistCount, () => ({
      top: `${22 + Math.random() * 48}%`,
      height: `${16 + Math.random() * 18}rem`,
      duration: `${18 + Math.random() * 16}s`,
      delay: `${Math.random() * 5}s`,
      opacity: 0.18 + Math.random() * 0.18,
    })),
    [mistCount]
  );

  const rainBack = useMemo(
    () => createParticles(rainCount, () => ({
      left: `${Math.random() * 100}%`,
      duration: `${0.7 + Math.random() * 0.45}s`,
      delay: `${Math.random() * 2.2}s`,
      opacity: 0.18 + Math.random() * 0.3,
      length: `${38 + Math.random() * 42}px`,
      sway: `${-20 + Math.random() * 12}deg`,
    })),
    [rainCount]
  );

  const rainFront = useMemo(
    () => createParticles(frontRainCount, () => ({
      left: `${Math.random() * 100}%`,
      duration: `${0.52 + Math.random() * 0.34}s`,
      delay: `${Math.random() * 1.8}s`,
      opacity: 0.28 + Math.random() * 0.34,
      length: `${52 + Math.random() * 72}px`,
      sway: `${-26 + Math.random() * 14}deg`,
    })),
    [frontRainCount]
  );

  const snowBack = useMemo(
    () => createParticles(snowCount, () => ({
      left: `${Math.random() * 100}%`,
      duration: `${7 + Math.random() * 9}s`,
      delay: `${Math.random() * 4}s`,
      size: `${2 + Math.random() * (isMobile ? 4 : 8)}px`,
      drift: `${-40 + Math.random() * 80}px`,
      opacity: 0.22 + Math.random() * 0.5,
      blur: `${Math.random() * 1.6}px`,
    })),
    [isMobile, snowCount]
  );

  const snowFront = useMemo(
    () => createParticles(frontSnowCount, () => ({
      left: `${Math.random() * 100}%`,
      duration: `${4 + Math.random() * 5}s`,
      delay: `${Math.random() * 3}s`,
      size: `${4 + Math.random() * (isMobile ? 5 : 9)}px`,
      drift: `${-70 + Math.random() * 140}px`,
      opacity: 0.34 + Math.random() * 0.48,
      blur: `${0.2 + Math.random() * 1.4}px`,
    })),
    [frontSnowCount, isMobile]
  );

  const stars = useMemo(
    () => createParticles(starCount, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 65}%`,
      size: `${1 + Math.random() * 2.6}px`,
      delay: `${Math.random() * 4}s`,
      duration: `${2 + Math.random() * 4}s`,
      opacity: 0.3 + Math.random() * 0.65,
    })),
    [starCount]
  );

  const sparks = useMemo(
    () => createParticles(sparkCount, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${2 + Math.random() * 4}px`,
      duration: `${3 + Math.random() * 4}s`,
      delay: `${Math.random() * 3}s`,
      opacity: 0.14 + Math.random() * 0.22,
    })),
    [sparkCount]
  );

  const showClouds = ['morning', 'sunny', 'evening', 'cloudy', 'rainy', 'storm', 'misty', 'snowy', 'night'].includes(mood);
  const showSun = ['morning', 'sunny', 'evening'].includes(mood);
  const showFog = !isLite && !isEconomy && ['misty', 'storm', 'rainy', 'cloudy', 'snowy', 'night', 'morning'].includes(mood);
  const showRain = mood === 'rainy' || mood === 'storm';
  const showSnow = mood === 'snowy';
  const showStars = mood === 'night';
  const showSparks = !isLite && ['sunny', 'morning', 'evening'].includes(mood);

  return (
    <>
      <div className={`weather-scene weather-scene--back weather-scene--${mood} ${isMobile ? 'weather-scene--mobile' : ''} ${isLite ? 'weather-scene--lite' : ''} ${isEconomy ? 'weather-scene--economy' : ''}`} aria-hidden="true">
        <div className="weather-scene__gradient" />
        <div className="weather-scene__aurora weather-scene__aurora--left" />
        <div className="weather-scene__aurora weather-scene__aurora--right" />
        {showSun ? (
          <>
            <div className="weather-sun" />
            <div className="weather-halo" />
          </>
        ) : null}
        {showStars ? (
          <div className="weather-stars">
            {stars.map((star) => (
              <span
                key={star.id}
                className="weather-star"
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  animationDelay: star.delay,
                  animationDuration: star.duration,
                  opacity: star.opacity,
                }}
              />
            ))}
          </div>
        ) : null}
        {showClouds ? (
          <div className="weather-clouds weather-clouds--back">
            {clouds.map((cloud) => (
              <span
                key={cloud.id}
                className="weather-cloud"
                style={{
                  top: cloud.top,
                  left: cloud.left,
                  width: cloud.width,
                  height: cloud.height,
                  animationDuration: cloud.duration,
                  animationDelay: cloud.delay,
                  opacity: cloud.opacity,
                  filter: `blur(${cloud.blur})`,
                  ['--cloud-scale']: cloud.scale,
                }}
              />
            ))}
          </div>
        ) : null}
        {showFog ? (
          <div className="weather-fog">
            {fogBands.map((band) => (
              <span
                key={band.id}
                className="weather-fog__band"
                style={{
                  top: band.top,
                  height: band.height,
                  animationDuration: band.duration,
                  animationDelay: band.delay,
                  opacity: band.opacity,
                }}
              />
            ))}
          </div>
        ) : null}
        {showSparks ? (
          <div className="weather-dust">
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className="weather-dust__spark"
                style={{
                  left: spark.left,
                  top: spark.top,
                  width: spark.size,
                  height: spark.size,
                  animationDelay: spark.delay,
                  animationDuration: spark.duration,
                  opacity: spark.opacity,
                }}
              />
            ))}
          </div>
        ) : null}
        <div className="weather-vignette" />
      </div>

      {(!isMobile && !isEconomy && !isLowPower) ? (
      <div className={`weather-scene weather-scene--front weather-scene--${mood} ${isMobile ? 'weather-scene--mobile' : ''} ${isLite ? 'weather-scene--lite' : ''} ${isEconomy ? 'weather-scene--economy' : ''}`} aria-hidden="true">
        {showRain ? (
          <>
            <div className={`weather-rain weather-rain--back ${mood === 'storm' ? 'weather-rain--storm' : ''}`}>
              {rainBack.map((drop) => (
                <span
                  key={drop.id}
                  className="weather-rain__drop"
                  style={{
                    left: drop.left,
                    animationDelay: drop.delay,
                    animationDuration: drop.duration,
                    opacity: drop.opacity,
                    height: drop.length,
                    ['--drop-tilt']: drop.sway,
                  }}
                />
              ))}
            </div>
            <div className={`weather-rain weather-rain--front ${mood === 'storm' ? 'weather-rain--storm' : ''}`}>
              {rainFront.map((drop) => (
                <span
                  key={drop.id}
                  className="weather-rain__drop weather-rain__drop--front"
                  style={{
                    left: drop.left,
                    animationDelay: drop.delay,
                    animationDuration: drop.duration,
                    opacity: drop.opacity,
                    height: drop.length,
                    ['--drop-tilt']: drop.sway,
                  }}
                />
              ))}
            </div>
            {!isLite && !isEconomy ? <div className="weather-top-drizzle" /> : null}
          </>
        ) : null}
        {showSnow ? (
          <>
            <div className="weather-snow weather-snow--back">
              {snowBack.map((flake) => (
                <span
                  key={flake.id}
                  className="weather-snow__flake"
                  style={{
                    left: flake.left,
                    width: flake.size,
                    height: flake.size,
                    animationDelay: flake.delay,
                    animationDuration: flake.duration,
                    opacity: flake.opacity,
                    filter: `blur(${flake.blur})`,
                    ['--flake-drift']: flake.drift,
                  }}
                />
              ))}
            </div>
            <div className="weather-snow weather-snow--front">
              {snowFront.map((flake) => (
                <span
                  key={flake.id}
                  className="weather-snow__flake weather-snow__flake--front"
                  style={{
                    left: flake.left,
                    width: flake.size,
                    height: flake.size,
                    animationDelay: flake.delay,
                    animationDuration: flake.duration,
                    opacity: flake.opacity,
                    filter: `blur(${flake.blur})`,
                    ['--flake-drift']: flake.drift,
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
        {mood === 'storm' ? (
          <>
            <div className="weather-lightning" />
            <div className="weather-storm-flash" />
          </>
        ) : null}
        {!isEconomy ? <div className="weather-top-sheen" /> : null}
      </div>
      ) : null}
    </>
  );
}

export default function PersonalizationEffects() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useUiSettings();
  const { isMobile, isLowPower } = useViewportFlags();
  const [lifetimeSeconds, setLifetimeSeconds] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(window.localStorage.getItem(LIFETIME_KEY) || 0);
  });
  const isRu = (i18n.language || 'ru').toLowerCase().startsWith('ru');
  const effectsQuality = settings.effectsQuality || (settings.showBackgroundFx ? (settings.economyEffects ? 'economy' : 'full') : 'off');
  const weatherMood = settings.weatherMode ? getWeatherMood(settings.weatherPreset) : 'off';
  const sceneMode = pathname.startsWith('/products')
    ? 'catalog'
    : pathname.startsWith('/polygraphy/editor') || pathname.startsWith('/polygraphy/tools/editor')
      ? 'editor'
      : pathname.startsWith('/profile')
        ? 'profile'
        : 'default';

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const root = document.documentElement;
    const mood = weatherMood;

    root.dataset.weatherMood = mood;

    let accent = settings.accentTone;
    if (settings.quantumMode) {
      const stored = window.localStorage.getItem(QUANTUM_KEY);
      if (stored && quantumAccents.includes(stored)) {
        accent = stored;
      } else {
        accent = quantumAccents[Math.floor(Math.random() * quantumAccents.length)];
        window.localStorage.setItem(QUANTUM_KEY, accent);
      }
    }

    root.dataset.accent = accent;
    root.dataset.rebellious = settings.rebelliousUi ? 'on' : 'off';

    if (settings.interfaceEvolution) {
      root.dataset.evolutionStage = getEvolutionStage(lifetimeSeconds);
    } else {
      root.dataset.evolutionStage = 'fresh';
    }
  }, [lifetimeSeconds, settings, weatherMood]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const next = Number(window.localStorage.getItem(LIFETIME_KEY) || 0) + 15;
      window.localStorage.setItem(LIFETIME_KEY, String(next));
      setLifetimeSeconds(next);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      const delta = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const next = Number(window.localStorage.getItem(LIFETIME_KEY) || 0) + delta;
      window.localStorage.setItem(LIFETIME_KEY, String(next));
      setLifetimeSeconds(next);
    };
  }, []);

  const mascotMessage = useMemo(() => {
    if (pathname.startsWith('/products')) {
      return isRu ? 'Я запомнил твои интересы в каталоге.' : 'I remembered your catalog interests.';
    }
    if (pathname.startsWith('/favorites')) {
      return isRu ? 'Твои фавориты уже ждут тебя.' : 'Your favorites are already waiting.';
    }
    if (pathname.startsWith('/polygraphy')) {
      return isRu ? 'Пора творить. Редакторы под рукой.' : 'Time to create. The editors are ready.';
    }
    if (pathname.startsWith('/profile')) {
      return isRu ? 'Здесь ты управляешь тем, как живёт сайт.' : 'This is where you control how the site behaves.';
    }
    return isRu ? 'Продолжим с того места, где ты остановился?' : 'Want to continue where you left off?';
  }, [isRu, pathname]);

  const avatarUrl = String(user?.avatarUrl || user?.avatar || '').trim();
  const userName = String(user?.name || '').trim();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'J';
  const evolutionStage = settings.interfaceEvolution ? getEvolutionStage(lifetimeSeconds) : 'fresh';
  const lifetimeProgress = Math.min(100, Math.round((lifetimeSeconds / (8 * 3600)) * 100));

  const pendingIntegrations = useMemo(() => {
    const items = [];
    if (settings.eyeTracking) items.push({ key: 'eye', icon: FiEye, label: isRu ? 'Взгляд / веб-камера' : 'Gaze / webcam' });
    if (settings.aiTwin) items.push({ key: 'ai', icon: FiZap, label: isRu ? 'AI-двойник' : 'AI twin' });
    if (settings.collectiveGhosts) items.push({ key: 'collective', icon: FiUsers, label: isRu ? 'Коллективный разум' : 'Collective mind' });
    if (settings.musicChameleon) items.push({ key: 'music', icon: FiMusic, label: isRu ? 'Музыкальный хамелеон' : 'Music chameleon' });
    if (settings.socialPalette) items.push({ key: 'palette', icon: FiCpu, label: isRu ? 'Палитра соцсетей' : 'Social palette' });
    if (settings.smartHome) items.push({ key: 'home', icon: FiZap, label: isRu ? 'Умный дом' : 'Smart home' });
    return items;
  }, [isRu, settings]);

  return (
    <>
      {settings.weatherMode && settings.showBackgroundFx && effectsQuality !== 'off' ? <WeatherScene mood={weatherMood} isMobile={isMobile} isLowPower={isLowPower} reduceMotion={settings.reduceMotion} economyEffects={settings.economyEffects} effectsQuality={effectsQuality} sceneMode={sceneMode} /> : null}

      {settings.lifetimeTimeline ? (
        <div className="persona-lifetime-chip" aria-live="polite">
          <FiClock />
          <span>
            {isRu ? 'Время с Jola:' : 'Time with Jola:'} <strong>{formatLifetime(lifetimeSeconds, isRu)}</strong>
          </span>
        </div>
      ) : null}

      {settings.avatarCompanion ? (
        <div className="persona-companion" aria-live="polite">
          <div className="persona-companion__avatar">
            {avatarUrl ? <img src={avatarUrl} alt={userName || 'Jola'} /> : <span>{userInitial}</span>}
          </div>
          <div className="persona-companion__copy">
            <strong>{isRu ? 'Твой маскот Jola' : 'Your Jola mascot'}</strong>
            <span>{mascotMessage}</span>
          </div>
          <FiZap className="persona-companion__spark" />
        </div>
      ) : null}

      {(settings.lifetimeTimeline || settings.interfaceEvolution || pendingIntegrations.length > 0) ? (
        <div className="persona-dock" aria-live="polite">
          {(settings.lifetimeTimeline || settings.interfaceEvolution) ? (
            <div className="persona-dock__card persona-dock__card--timeline">
              <div className="persona-dock__title">
                <FiClock />
                <span>{isRu ? 'Личная шкала Jola' : 'Jola personal timeline'}</span>
              </div>
              <strong>{formatLifetime(lifetimeSeconds, isRu)}</strong>
              <div className="persona-progress" role="progressbar" aria-valuenow={lifetimeProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="persona-progress__fill" style={{ width: `${lifetimeProgress}%` }} />
              </div>
              {settings.interfaceEvolution ? (
                <span className="persona-stage-tag">
                  {evolutionStage === 'legend'
                    ? (isRu ? 'Стадия: старожил' : 'Stage: legend')
                    : evolutionStage === 'insider'
                      ? (isRu ? 'Стадия: свой человек' : 'Stage: insider')
                      : (isRu ? 'Стадия: новое знакомство' : 'Stage: fresh')}
                </span>
              ) : null}
            </div>
          ) : null}

          {pendingIntegrations.length > 0 ? (
            <div className="persona-dock__card persona-dock__card--api">
              <div className="persona-dock__title">
                <FiCpu />
                <span>{isRu ? 'Подключаемые режимы' : 'Attachable modes'}</span>
              </div>
              <div className="persona-api-list">
                {pendingIntegrations.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.key} className="persona-api-pill">
                      <Icon />
                      {item.label}
                    </span>
                  );
                })}
              </div>
              <small>{isRu ? 'Режимы включены и ждут API-подключения.' : 'Modes are enabled and waiting for API wiring.'}</small>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
