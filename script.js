(() => {
	const MARKER_TEXT = "PAYMENT_TERMS_DYNAMIC";

	function parsePriceValue(text) {
		const match = (text || "").replace(/\s+/g, " ").match(/₹\s*([\d,]+)/);
		if (!match) {
			return null;
		}

		return Number(match[1].replace(/,/g, ""));
	}

	function getPaymentTerms(price) {
		if (price < 45000) {
			return { advance: 10000, balanceDays: 30 };
		}

		if (price <= 90000) {
			return { advance: 15000, balanceDays: 30 };
		}

		return { advance: 25000, balanceDays: 40 };
	}

	function formatCurrency(value) {
		return `₹${value.toLocaleString("en-IN")}`;
	}

	function buildPaymentTermsMarkup(terms) {
		return `
				<p>→ Advance: ${formatCurrency(terms.advance)} (to book your spot)</p>
				<p>→ Balance: To be paid ${terms.balanceDays} days before departure</p>
				<p>→ GST (5%) and TCS (2%) applicable extra.</p>
				<p style="margin-top: 14px; font-weight: 600;">Cancellation Policy:</p>
				<p>→ Upto 45 days before departure – 75% of overall price</p>
				<p>→ Upto 31 days before departure – 50% of overall price</p>
				<p>→ Less than 30 days before departure – No refund</p>
			`;
	}

	function getOrCreateMarkerNode(paymentBox) {
		for (const node of paymentBox.childNodes) {
			if (node.nodeType === Node.COMMENT_NODE && (node.nodeValue || "").includes(MARKER_TEXT)) {
				return node;
			}
		}

		const marker = document.createComment(` ${MARKER_TEXT} `);
		paymentBox.appendChild(marker);
		return marker;
	}

	function isPaymentTermsItem(item) {
		if (!(item instanceof Element) || !item.classList.contains("accordion-item")) {
			return false;
		}

		if (item.classList.contains("payment-terms-item")) {
			return true;
		}

		const title = (item.querySelector(".accordion-date")?.textContent || "").toLowerCase();
		return title.includes("payment terms");
	}

	function removeStalePaymentTerms() {
		document.querySelectorAll(".payment-terms-item").forEach(item => item.remove());
		document.querySelectorAll(".payment-terms-section").forEach((section, index) => {
			if (index > 0) {
				section.remove();
			}
		});

		document.querySelectorAll(".accordion-item").forEach(item => {
			if (isPaymentTermsItem(item)) {
				item.remove();
			}
		});
	}

	function getTripPrice() {
		const priceCells = Array.from(document.querySelectorAll(".dates-pricing-wrapper .pricing-table tbody td"));
		const prices = priceCells
			.map(cell => parsePriceValue(cell.textContent))
			.filter(value => Number.isFinite(value));

		if (!prices.length) {
			return null;
		}

		return Math.min(...prices);
	}

	function ensurePaymentTermsSection() {
		let section = document.querySelector(".payment-terms-section");
		const faqSection = Array.from(document.querySelectorAll(".section")).find(candidate => {
			const heading = candidate.querySelector(".section-title h2");
			return (heading?.textContent || "").trim().toLowerCase() === "frequently asked questions";
		});

		if (!section) {
			section = document.createElement("section");
			section.className = "payment-terms-section";
			section.innerHTML = `
				<div class="container">
					<h2>Payment Terms</h2>
					<div class="payment-box">
						<!-- ${MARKER_TEXT} -->
					</div>
				</div>
			`;
		}

		if (faqSection?.parentNode) {
			faqSection.parentNode.insertBefore(section, faqSection);
		} else if (section.parentNode !== document.body) {
			document.body.appendChild(section);
		}

		return section;
	}

	function renderPaymentTerms() {
		removeStalePaymentTerms();

		const section = ensurePaymentTermsSection();
		const paymentBox = section?.querySelector(".payment-box");
		if (!paymentBox) {
			return;
		}

		const price = getTripPrice();
		if (price === null) {
			paymentBox.innerHTML = `<!-- ${MARKER_TEXT} -->`;
			return;
		}

		const terms = getPaymentTerms(price);
		paymentBox.innerHTML = `<!-- ${MARKER_TEXT} -->${buildPaymentTermsMarkup(terms)}`;
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", renderPaymentTerms);
	} else {
		renderPaymentTerms();
	}
})();

