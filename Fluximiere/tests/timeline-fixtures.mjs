// Minimal fixtures authored for these tests using the object-reference structure
// observed in Adobe-generated PRPROJ projects. No project or footage is bundled.
const t=s=>String(BigInt(s)*254016000000n);
export function premiereFixture({multiple=false,trackIndex=2,mediaPath='C:\\Footage\\poster.png'}={}){
  return `<?xml version="1.0" encoding="UTF-8"?><PremiereData Version="3">
    <Sequence ObjectUID="sequence-main" Version="11"><Name>Premiere cuts</Name><TrackGroups><TrackGroup Index="0"><Second ObjectRef="vg"/></TrackGroup><TrackGroup Index="1"><Second ObjectRef="ag"/></TrackGroup></TrackGroups></Sequence>
    ${multiple?'<Sequence ObjectUID="sequence-empty"><Name>Empty sequence</Name><TrackGroups><TrackGroup><Second ObjectRef="empty"/></TrackGroup></TrackGroups></Sequence><VideoTrackGroup ObjectID="empty"><TrackGroup><FrameRate>8467200000</FrameRate><Tracks/></TrackGroup><FrameRect>0,0,320,180</FrameRect></VideoTrackGroup>':''}
    <VideoTrackGroup ObjectID="vg"><TrackGroup><FrameRate>8467200000</FrameRate><Tracks><Track Index="0" ObjectURef="v1"/><Track Index="${trackIndex}" ObjectURef="v3"/></Tracks></TrackGroup><FrameRect>0,0,320,180</FrameRect><PixelAspectRatio>1,1</PixelAspectRatio></VideoTrackGroup>
    <AudioTrackGroup ObjectID="ag"><TrackGroup><FrameRate>5292000</FrameRate><Tracks><Track Index="1" ObjectURef="a2"/></Tracks></TrackGroup></AudioTrackGroup>
    <VideoClipTrack ObjectUID="v1"><ClipTrack><Track><Index>0</Index></Track><ClipItems><TrackItems><TrackItem ObjectRef="vi"/></TrackItems></ClipItems></ClipTrack></VideoClipTrack>
    <VideoClipTrack ObjectUID="v3"><ClipTrack><Track><Index>${trackIndex}</Index></Track><ClipItems><TrackItems><TrackItem ObjectRef="ii"/></TrackItems></ClipItems></ClipTrack></VideoClipTrack>
    <AudioClipTrack ObjectUID="a2"><ClipTrack><Track><Index>1</Index><IsLocked>true</IsLocked><IsMuted>true</IsMuted></Track><ClipItems><TrackItems><TrackItem ObjectRef="ai"/></TrackItems></ClipItems></ClipTrack></AudioClipTrack>
    ${[['vi','vs',1,3,'Video'],['ii','is',0,4,'Video'],['ai','as',1,4,'Audio']].map(([id,sub,start,end,type])=>`<${type}ClipTrackItem ObjectID="${id}"><ClipTrackItem><TrackItem><Start>${t(start)}</Start><End>${t(end)}</End></TrackItem><SubClip ObjectRef="${sub}"/></ClipTrackItem></${type}ClipTrackItem>`).join('')}
    ${[['vs','vc','Footage'],['is','ic','Poster'],['as','ac','Soundtrack']].map(([id,clip,name])=>`<SubClip ObjectID="${id}"><Clip ObjectRef="${clip}"/><Name>${name}</Name></SubClip>`).join('')}
    ${[['vc','vsource',4,8,'Video'],['ic','isource',0,4,'Video'],['ac','asource',2,5,'Audio']].map(([id,source,start,end,type])=>`<${type}Clip ObjectID="${id}"><Clip><Source ObjectRef="${source}"/><InPoint>${t(start)}</InPoint><OutPoint>${t(end)}</OutPoint></Clip></${type}Clip>`).join('')}
    ${[['vsource','vm','Video'],['isource','im','Video'],['asource','am','Audio']].map(([id,media,type])=>`<${type}MediaSource ObjectID="${id}"><MediaSource><Media ObjectURef="${media}"/></MediaSource><OriginalDuration>${t(10)}</OriginalDuration></${type}MediaSource>`).join('')}
    <Media ObjectUID="vm"><ActualMediaFilePath>C:\\Footage\\clip.mp4</ActualMediaFilePath></Media>
    <Media ObjectUID="im"><ActualMediaFilePath>${mediaPath}</ActualMediaFilePath></Media>
    <Media ObjectUID="am"><FilePath>C:\\Footage\\sound.wav</FilePath></Media>
    <Project ObjectID="project"><UI><Ignored ObjectID="vc"/></UI></Project>
  </PremiereData>`;
}
export function finalCutFixture(){return `<?xml version="1.0"?><!DOCTYPE xmeml><xmeml version="5"><sequence id="edit"><name>XML titles</name><duration>120</duration><rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate><media><video><format><samplecharacteristics><width>320</width><height>180</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>
  <track><clipitem id="picture"><name>Poster</name><start>0</start><end>60</end><in>0</in><out>60</out><stillframe>TRUE</stillframe><file id="image"><name>poster.png</name><pathurl>file://localhost/C:/Footage/poster%20one.png</pathurl><rate><timebase>30</timebase><ntsc>FALSE</ntsc></rate><duration>120</duration></file></clipitem><clipitem id="picture2"><name>Poster again</name><start>60</start><end>120</end><in>0</in><out>60</out><stillframe>TRUE</stillframe><file id="image"/></clipitem></track>
  <track><generatoritem id="text"><name>Opening words</name><start>15</start><end>105</end><in>0</in><out>90</out><effect><name>Text</name><effectid>Text</effectid><parameter><parameterid>str</parameterid><value>A fresh perspective.</value></parameter></effect></generatoritem></track>
  </video><audio><track><clipitem id="audio"><name>Voice</name><rate><timebase>24</timebase><ntsc>FALSE</ntsc></rate><start>30</start><end>90</end><in>48</in><out>96</out><file id="voice"><name>voice.wav</name><pathurl>file:///C:/voice.wav</pathurl><duration>240</duration><rate><timebase>24</timebase></rate></file></clipitem></track></audio></media></sequence></xmeml>`;}
