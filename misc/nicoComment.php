<?php

$xml_data =<<< EOT
  <packet>
    <thread thread="1309980706" version="20090904" user_id="595548" scores="1" with_global="1"/>
    <thread_leaves thread="1309980706" user_id="595548" scores="1">0-4:100,250</thread_leaves>
    <thread thread="1312621314" version="20090904" user_id="595548" scores="1"/>
    <thread_leaves thread="1312621314" user_id="595548" scores="1">0-4:100,250</thread_leaves>
    <thread thread="1309980706" version="20061206" res_from="-10" fork="1" click_revision="-1" scores="1"/>
    <thread thread="1309980706" version="20061206" res_from="-1" />
  </packet>
EOT;

$JP =<<< EOT
  <packet>
    <thread thread="1309980706" version="20090904" user_id="30215686" scores="1" nicoru="1"/>
    <thread_leaves thread="1309980706" user_id="30215686" scores="1" nicoru="1">0-4:100,250</thread_leaves>
  </packet>
EOT;

$zh_TW =<<< EOT
  <packet>
    <thread thread="1309980706" version="20090904" user_id="30215686" scores="1" nicoru="1" language="2"/>
    <thread_leaves thread="1309980706" user_id="30215686" scores="1" nicoru="1" language="2">0-4:100,250</thread_leaves>
  </packet>
EOT;

$EN =<<< EOT
  <packet>
    <thread thread="1309980706" version="20090904" user_id="30215686" scores="1" nicoru="1" language="1"/>
    <thread_leaves thread="1309980706" user_id="30215686" scores="1" nicoru="1" language="1">0-4:100,250</thread_leaves>
  </packet>
EOT;

$TEST =<<< EOT
    <thread thread="1309980706" version="20061206" res_from="-10" language="0" />
EOT;

$url = "http://msg.nicovideo.jp/30/api/";
$header[] = "Content-type: text/xml";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $TEST);
$response = curl_exec($ch);
if(curl_errno($ch))
{
    print curl_error($ch);
}
curl_close($ch);
echo $response;

?>