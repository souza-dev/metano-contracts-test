// contracts/NFTMarketplace.sol
// SPDX-License-Identifier: MIT OR Apache-2.0
// 
// adapt and edit from (Nader Dabit): 
//    https://github.com/dabit3/polygon-ethereum-nextjs-marketplace/blob/main/contracts/Market.sol

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 //prevents re-entrancy attacks
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyMarketplace is ReentrancyGuard, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _itemCounter;
  Counters.Counter private _itemSoldCounter;

  address tokenAddress = address(0);
  address marketowner; 
  uint256 public listingFee = 0;

  enum State { Created, Release, Inactive }

  constructor(address tokenAddr){
    marketowner = msg.sender;
    tokenAddress = tokenAddr;
  }

  struct MarketItem {
    uint id;
    address nftContract;
    uint256 tokenId;
    address payable seller;
    address buyer;
    uint256 price;
    State state;
  }

  mapping(uint256 => MarketItem) private marketItems;

  event MarketItemCreated (
    uint indexed id,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address buyer,
    uint256 price,
    State state
  );

  event MarketItemSold (
    uint indexed id,
    address indexed nftContract,
    uint256 indexed tokenId,
    address seller,
    address buyer,
    uint256 price,
    State state
  );


  function setListingFee(uint fee) public onlyOwner {
      require(fee >= 0, "fee cannot be less than 0");
      listingFee = fee;
  }
  /**
   * @dev Returns the listing fee of the marketplace
   */
  function getListingFee() public view returns (uint256) {
    return listingFee;
  }

  function setTokenAddress(address tokenAddr) public onlyOwner {
    require(tokenAddr != address(0), "The new address cannot be address 0");
    tokenAddress = tokenAddr;
  }

  //Adicionado porque não tinha esse get e por isso não tinha como testar.
  function getTokenAddress() public view returns (address) {
    return tokenAddress;
  }
  
  /**
   * @dev create a MarketItem for NFT sale on the marketplace.
   * 
   * List an NFT.
   */
  function createMarketItem(
    address nftContract,
    uint256 tokenId,
    uint256 price
  ) public payable nonReentrant {

    require(price > 0, "Price must be at least 1 wei");
    require(msg.value == listingFee, "Fee must be equal to listing fee");
    require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "must be the owner");

    IERC20(tokenAddress).transferFrom(msg.sender, marketowner, msg.value);
    IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

    _itemCounter.increment();
    uint256 id = _itemCounter.current() - 1;
  
    marketItems[id] =  MarketItem(
      id,
      nftContract,
      tokenId,
      payable(msg.sender),
      address(0),
      price,
      State.Created
    );

    emit MarketItemCreated(
      id,
      nftContract,
      tokenId,
      msg.sender,
      address(0),
      price,
      State.Created
    );
  }

  /**
   * @dev delete a MarketItem from the marketplace.
   * 
   * de-List an NFT.
   * 
   * todo ERC721.approve can't work properly!! comment out
   */
  function deleteMarketItem(uint256 itemId) public nonReentrant {
    require(itemId < _itemCounter.current(), "id must < item count");
    require(marketItems[itemId].state == State.Created, "item must be on market");
    require(marketItems[itemId].seller == msg.sender, "sender must be the owner");
    
    MarketItem storage item = marketItems[itemId];

    // require(IERC721(item.nftContract).ownerOf(item.tokenId) == msg.sender, "must be the owner");
    // require(IERC721(item.nftContract).getApproved(item.tokenId) == address(this), "NFT must be approved to market");

    item.state = State.Inactive;

    emit MarketItemSold(
      item.id,
      item.nftContract,
      item.tokenId,
      msg.sender,
      address(0),
      0,
      State.Inactive
    );
  }

  /**
   * @dev (buyer) buy a MarketItem from the marketplace.
   * Transfers ownership of the item, as well as funds
   * NFT:         seller    -> buyer
   * value:       buyer     -> seller
   * listingFee:  contract  -> marketowner
   */
  function createMarketSale(
    address nftContract,
    uint256 id
  ) public payable nonReentrant {

    MarketItem storage item = marketItems[id]; //should use storge!!!!
    uint price = item.price;
    uint tokenId = item.tokenId;

    require(msg.value == price, "Please submit the asking price");
    // require(IERC721(nftContract).getApproved(tokenId) == address(this), "NFT must be approved to market");

    IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
    IERC20(tokenAddress).transferFrom(msg.sender, marketItems[id].seller, price);

    item.buyer = payable(msg.sender);
    item.state = State.Release;
    _itemSoldCounter.increment();    

    emit MarketItemSold(
      id,
      nftContract,
      tokenId,
      item.seller,
      msg.sender,
      price,
      State.Release
    );    
  }

  /**
   * @dev Returns all unsold market items
   * condition: 
   *  1) state == Created
   *  2) buyer = 0x0
   *  3) still have approve
   */
  function fetchActiveItems() public view returns (MarketItem[] memory) {
    return fetchHelper(FetchOperator.ActiveItems);
  }

  /**
   * @dev Returns only market items a user has purchased
   * todo pagination
   */
  function fetchMyPurchasedItems() public view returns (MarketItem[] memory) {
    return fetchHelper(FetchOperator.MyPurchasedItems);
  }

  /**
   * @dev Returns only market items a user has created
   * todo pagination
  */
  function fetchMyCreatedItems() public view returns (MarketItem[] memory) {
    return fetchHelper(FetchOperator.MyCreatedItems);
  }

  enum FetchOperator { ActiveItems, MyPurchasedItems, MyCreatedItems}

  /**
   * @dev fetch helper
   * todo pagination   
   */
   function fetchHelper(FetchOperator _op) private view returns (MarketItem[] memory) {     
    
    uint total = _itemCounter.current();
    uint itemCount = 0;

    for (uint i = 0; i < total; i++) {
      if (isCondition(marketItems[i], _op)) {
        itemCount ++;
      }
    }

    uint index = 0;
    MarketItem[] memory items = new MarketItem[](itemCount);

    for (uint i = 0; i <  total; i++) {
      if (isCondition(marketItems[i], _op)) {
        items[index] = marketItems[i];
        index ++;
      }
    }
    return items;
  } 

  /**
   * @dev helper to build condition
   *
   * todo should reduce duplicate contract call here
   * (IERC721(item.nftContract).getApproved(item.tokenId) called in two loop
   */
  function isCondition(MarketItem memory item, FetchOperator _op) private view returns (bool){
    if(_op == FetchOperator.MyCreatedItems){ 
      return 
        (item.seller == msg.sender
          && item.state != State.Inactive
        )? true
         : false;
    }else if(_op == FetchOperator.MyPurchasedItems){
      return
        (item.buyer ==  msg.sender) ? true: false;
    }else if(_op == FetchOperator.ActiveItems){
      return 
        (item.buyer == address(0) 
          && item.state == State.Created
          && (IERC721(item.nftContract).getApproved(item.tokenId) == address(0))
        )? true
         : false;
    }else{
      return false;
    }
  }

}