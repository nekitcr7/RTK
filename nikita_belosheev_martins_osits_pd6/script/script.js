$(function() {
      let peepMode = false;

      const moodKeywords = {
        happy: 'happy',
        sad: 'sad',
        chill: 'chill',
        energetic: 'energetic'
      };

      const state = {
        cache: {}, order: {}, pIndex: {}, tIndex: {}, lengths: {},
        peepTracks: null, peepIndex: 0, playedTracks: {}
      };

      $('#theme-toggle').click(() => $('body').toggleClass('dark'));

      $('#peep-toggle').click(() => {
        peepMode = true;
        $('h1').text('🎵 Peep Mode');
        $('body').css({
          background: '#1d1d1d',
          color: '#ffb6c1',
          fontFamily: 'Courier New, monospace'
        });
        loadTracks(false);
      });

      function initPlayer(container) {
        const audio = container.find('audio')[0];
        const btn = container.find('button.play');
        const bar = container.find('.bar');
        const time = container.find('.time');
        const vol = container.find('.volume')[0];

        btn.click(() => {
          $('audio').each((i, a) => {
            if (a !== audio) a.pause();
          });
          audio.paused ? audio.play() : audio.pause();
        });

        vol.oninput = () => audio.volume = vol.value;

        audio.onplay = () => btn.text('⏸️');
        audio.onpause = () => btn.text('▶️');

        audio.ontimeupdate = () => {
          if (!audio.duration) return;
          const pct = (audio.currentTime / audio.duration) * 100;
          bar.css('width', pct + '%');
          const m = Math.floor(audio.currentTime / 60);
          const s = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
          time.text(`${m}:${s}`);
        };

        container.find('.progress').click(e => {
          const rect = container.find('.progress')[0].getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          audio.currentTime = pct * audio.duration;
        });

        audio.onended = () => {
          const next = container.closest('.track').next().find('audio')[0];
          if (next) next.play();
        };
      }

      function displayPeep(cnt) {
        $('#tracks').empty();
        const arr = state.peepTracks;
        const slice = arr.slice(state.peepIndex, state.peepIndex + cnt);
        slice.forEach(tr => {
          if (!tr.preview || tr.artist.name.toLowerCase() !== 'lil peep') return;
          const div = $('<div>').addClass('track');
          const img = $('<img>').attr('src', tr.album.cover_medium);
          const info = $('<div>').addClass('track-info');
          const title = $(`<p><strong><a href="${tr.link}" target="_blank">${tr.title}</a></strong></p>`);
          const artist = $(`<p><a href="https://open.spotify.com/search/${encodeURIComponent(tr.artist.name)}" target="_blank">${tr.artist.name}</a></p>`);
          const player = $(`
            <div class="custom-player">
              <button class="play">▶️</button>
              <input class="volume" type="range" min="0" max="1" step="0.01" value="0.25">
              <div class="progress"><div class="bar"></div></div>
              <span class="time">0:00</span>
              <audio src="${tr.preview}"></audio>
            </div>
          `);
          info.append(title, artist, player);
          div.append(img, info);
          $('#tracks').append(div);
          initPlayer(player);
        });
        state.peepIndex += slice.length;
        const rem = state.peepTracks.length - state.peepIndex;
        rem > 0 ? $('#more-button').show().text(`Ielādēt vēl (${rem})`) : $('#more-button').hide();
      }

      function displayNormal(slice, mood, cnt) {
        $('#tracks').empty();
        slice.forEach(tr => {
          const div = $('<div>').addClass('track');
          const img = $('<img>').attr('src', tr.album.cover_medium);
          const info = $('<div>').addClass('track-info');
          const title = $(`<p><strong><a href="${tr.link}" target="_blank">${tr.title}</a></strong></p>`);
          const artist = $(`<p><a href="https://open.spotify.com/search/${encodeURIComponent(tr.artist.name)}" target="_blank">${tr.artist.name}</a></p>`);
          const player = $(`
            <div class="custom-player">
              <button class="play">▶️</button>
              <input class="volume" type="range" min="0" max="1" step="0.01" value="0.251">
              <div class="progress"><div class="bar"></div></div>
              <span class="time">0:00</span>
              <audio src="${tr.preview}"></audio>
            </div>
          `);
          info.append(title, artist, player);
          div.append(img, info);
          $('#tracks').append(div);
          initPlayer(player);
        });
      }

      function loadTracks(more = false) {
        const cnt = +$('#count-select').val();
        const mood = $('#mood-select').val();
        $('#loading').text('Notiek ielāde...');
        $('#find-button,#more-button').prop('disabled', true);

        if (peepMode) {
          if (!state.peepTracks) {
            $.ajax({
              url: `https://api.deezer.com/search/track?q=artist:%22Lil Peep%22&output=jsonp`,
              dataType: 'jsonp',
              success(d) {
                state.peepTracks = d.data;
                state.peepIndex = 0;
                displayPeep(cnt);
                $('#loading').text('');
                $('#find-button,#more-button').prop('disabled', false);
              }
            });
          } else {
            displayPeep(cnt);
            $('#loading').text('');
            $('#find-button,#more-button').prop('disabled', false);
          }
          return;
        }

        if (!state.cache[mood]) {
          $.ajax({
            url: `https://api.deezer.com/search/playlist?q=${moodKeywords[mood]}&output=jsonp`,
            dataType: 'jsonp',
            success(d) {
              state.cache[mood] = d.data;
              loadTracks(more);
            }
          });
          return;
        }

        const list = state.cache[mood];
        const rIdx = Math.floor(Math.random() * list.length);
        const playlist = list[rIdx];

        $.ajax({
          url: `https://api.deezer.com/playlist/${playlist.id}?output=jsonp`,
          dataType: 'jsonp',
          success(d) {
            const tracks = d.tracks.data.filter(t => t.preview);
            state.playedTracks[mood] = state.playedTracks[mood] || new Set();
            let available = tracks.filter(t => !state.playedTracks[mood].has(t.id));
            if (available.length < cnt) {
              state.playedTracks[mood].clear();
              available = tracks;
            }
            available.sort(() => Math.random() - 0.5);
            const slice = available.slice(0, cnt);
            slice.forEach(t => state.playedTracks[mood].add(t.id));
            displayNormal(slice, mood, cnt);
            $('#loading').text('');
            $('#find-button').prop('disabled', false);
            $('#more-button').hide();
          }
        });
      }

      $('#find-button').click(() => {
        peepMode = false;
        loadTracks(false);
      });

      $('#more-button').click(() => loadTracks(true));
    });