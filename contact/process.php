<?php
declare(strict_types=1);

/* OneName Consulting — contact form receiver

   Receives the contact form from js/contact-form.js and emails it to the
   inbox below through the host's own mail system. No third-party service is
   involved, but the host must run PHP.

   Every answer is JSON, with an HTTP status the page acts on:

     200  sent, or quietly dropped because the trap field was filled
     405  anything other than a POST
     422  a field is missing or too long, or the email address is not valid
     429  too many messages, from one visitor or in total
     500  the host's mail system refused the message

   What it guards against:

   - Header injection. Nothing the visitor types reaches the subject or the
     From line. The one header built from input is Reply-To, and only after
     the address passes PHP's email validation, which rejects line breaks.
   - Spam. The hidden trap field is checked here as well as in the browser,
     and sending is rate limited per visitor and in total.
   - Oversized or malformed input. Lengths are capped to match the form's
     maxlength attributes, text must be valid UTF-8, and control characters
     are removed.

   The email is plain text, so there is nothing for a script to hide in and
   nothing to escape. If messages are ever shown on a web page or stored,
   escape them there.

   Before going live: create the FROM_ADDRESS mailbox in the hosting control
   panel, send a test message, and check the Outlook junk folder the first
   time.                                                                     */

// Where messages are delivered.
const TO_ADDRESS = 'OnenameConsulting@outlook.com';

// The sender. It must be a real mailbox on the domain the site is hosted on,
// or receiving servers treat the message as spoofed and file it as junk.
const FROM_ADDRESS = 'website@onenameconsulting.com';

// At most this many messages per visitor, and in total, per window.
const LIMIT_PER_VISITOR = 3;
const LIMIT_TOTAL = 20;
const LIMIT_WINDOW = 3600; // seconds

// Must match the maxlength attributes in contact/index.html.
const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 5000;

const TOPICS = ['Business coaching', 'Consultancy & advisory', 'Something else'];

function respond(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(
        ['sent' => $status === 200, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

// A posted field as trimmed text. Anything that is not a single, valid UTF-8
// string counts as empty.
function field(string $name): string
{
    $value = $_POST[$name] ?? '';

    if (!is_string($value) || preg_match('//u', $value) !== 1) {
        return '';
    }

    return trim($value);
}

// Length in characters rather than bytes, so accented names are not cut short.
function length(string $text): int
{
    return (int) preg_match_all('/./su', $text);
}

// Records one send against a bucket and says whether it stays within the
// limit. Timestamps are kept in the system temp directory, outside the web
// root, in a file named by hash rather than by the visitor's IP address.
//
// If that directory cannot be written, sending is allowed and the problem is
// logged: an enquiry turned away by a hosting quirk costs more than one
// unthrottled message.
function within_limit(string $bucket, int $limit): bool
{
    $dir = sys_get_temp_dir() . '/onename-contact';

    if (!is_dir($dir) && !@mkdir($dir, 0700) && !is_dir($dir)) {
        error_log('contact form: cannot create ' . $dir);
        return true;
    }

    $handle = @fopen($dir . '/' . hash('sha256', $bucket), 'c+');

    if ($handle === false) {
        error_log('contact form: cannot write to ' . $dir);
        return true;
    }

    flock($handle, LOCK_EX);

    $now = time();
    $recent = [];

    foreach (explode("\n", (string) stream_get_contents($handle)) as $stamp) {
        if ((int) $stamp > $now - LIMIT_WINDOW) {
            $recent[] = $stamp;
        }
    }

    $allowed = count($recent) < $limit;

    if ($allowed) {
        $recent[] = (string) $now;
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, implode("\n", $recent));
    flock($handle, LOCK_UN);
    fclose($handle);

    return $allowed;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'This address only accepts the contact form.');
}

// No person can reach the trap field, so anything in it came from a bot.
// Answer as though the message was sent, so the bot learns nothing.
if (($_POST['website'] ?? '') !== '') {
    respond(200, 'Sent.');
}

$fallback = ' Please write to ' . TO_ADDRESS . ' instead.';

$name = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', field('name')));
$email = field('email');
$topic = field('topic');
$message = trim(preg_replace(
    ['/\r\n?/', '/[\x00-\x08\x0B-\x1F\x7F]+/'],
    ["\n", ''],
    field('message')
));

if (!in_array($topic, TOPICS, true)) {
    $topic = 'Something else';
}

if ($name === '' || length($name) > MAX_NAME
    || $message === '' || length($message) > MAX_MESSAGE
    || strlen($email) > MAX_EMAIL
    || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    respond(422, 'Please check your name, email address and message, then try again.');
}

// REMOTE_ADDR is the only address a visitor cannot fake. Behind a proxy or CDN
// it becomes the proxy's, and every visitor then shares LIMIT_PER_VISITOR.
$visitor = 'visitor:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown');

if (!within_limit($visitor, LIMIT_PER_VISITOR) || !within_limit('total', LIMIT_TOTAL)) {
    respond(429, 'Several messages have been sent from here in a short time.' . $fallback);
}

$body = implode("\r\n", [
    'Name:  ' . $name,
    'Email: ' . $email,
    'Topic: ' . $topic,
    '',
    str_replace("\n", "\r\n", $message),
    '',
    '-- ',
    'Sent from the website contact form. Reply to this email to answer ' . $name . ' directly.',
]);

// Quoted-printable keeps a long unbroken paragraph under the line length mail
// servers accept. -f sets the envelope sender to the same mailbox, which is
// the address SPF checks.
$sent = mail(
    TO_ADDRESS,
    'Website enquiry: ' . $topic,
    quoted_printable_encode($body),
    [
        'From' => 'OneName Consulting website <' . FROM_ADDRESS . '>',
        'Reply-To' => $email,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'quoted-printable',
    ],
    '-f' . FROM_ADDRESS
);

if (!$sent) {
    error_log('contact form: mail() failed');
    respond(500, 'Something went wrong sending this.' . $fallback);
}

respond(200, 'Sent.');
